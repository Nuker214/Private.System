import os
import json
import time
import requests
from datetime import datetime
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables from .env (for local development)
load_dotenv()

# --- Flask Configuration ---
# For a backend that only provides an API/Socket.IO and does not directly serve
# the index.html from its root, template_folder and static_folder could be omitted or set differently.
# However, for local testing flexibility or if you *later* decide to also serve from Render directly,
# we will set it up to recognize the 'website' folder.
app = Flask(__name__, static_folder='website', template_folder='website')
app.config['SECRET_KEY'] = os.getenv("FLASK_SECRET_KEY") # CRUCIAL for Flask sessions
# CORS is absolutely essential as your GitHub Pages frontend will be on a different domain
# than your Render backend.
CORS(app) 

# --- SocketIO Configuration ---
# cors_allowed_origins="*": This allows connections from any domain, which is easiest for development
# and GitHub Pages. For production, consider explicitly listing your GitHub Pages domain
# (e.g., ["https://your-github-username.github.io"]).
socketio = SocketIO(app, cors_allowed_origins="*", logger=True, engineio_logger=True)

# --- Global Variables for Backend State ---
# Stores active user WebSocket connections.
# Format: {username: {session_id: {'socket_id': <sid>, 'ip_address': <ip>, 'user_agent': <ua>}}}
active_user_sessions = {}
last_ping_times = {} # Tracks last client activity to identify truly "online" users

# Webhook URL for Flask to send general activity (login, logout, data returns from client) to Discord
SITE_GENERAL_ACTIVITY_WEBHOOK_URL = os.getenv("SITE_GENERAL_ACTIVITY_WEBHOOK_URL")
WHITELIST_JSON_URL = os.getenv("https://raw.githubusercontent.com/Nuker214/Private.System/refs/heads/main/Whitelist.json") # URL to fetch whitelist from

# Store whitelist in memory (can be periodically reloaded if WHITELIST_JSON_URL points to a dynamic source)
whitelist_data = []

# --- Helper Functions ---
def load_whitelist():
    """Fetches and loads the whitelist from the configured URL."""
    global whitelist_data
    if not WHITELIST_JSON_URL or WHITELIST_JSON_URL == "YOUR_WHITELIST_JSON_URL":
        print("WARNING: WHITELIST_JSON_URL not correctly set in .env for app.py. Whitelist will be empty.")
        return False
    try:
        response = requests.get(WHITELIST_JSON_URL, timeout=10)
        response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        whitelist_data = response.json()
        print(f"Whitelist loaded successfully from {WHITELIST_JSON_URL}. Found {len(whitelist_data)} users.")
        return True
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Failed to load whitelist from {WHITELIST_JSON_URL}: {e}")
        whitelist_data = [] # Clear if loading fails to prevent using stale data
        return False

# Load whitelist once when the Flask app starts
load_whitelist()

# Helper for Discord Embeds
def create_embed(title, description, color, fields=None, footer_text=None):
    """Creates a Discord embed structure."""
    embed = {
        "title": title,
        "description": description,
        "color": color,
        "timestamp": datetime.utcnow().isoformat() + "Z", # UTC timezone
    }
    if fields:
        # Filter out empty/None values in fields to avoid Discord API errors
        embed_fields = []
        for field in fields:
            if field and field.get('name') and field.get('value') is not None:
                # Ensure values are string type as per Discord API
                field['value'] = str(field['value']) 
                if len(field['value']) > 1024: # Discord embed field value limit
                    field['value'] = field['value'][:1020] + '...'
                embed_fields.append(field)
        embed["fields"] = embed_fields

    if footer_text:
        embed["footer"] = {"text": footer_text}
    return embed

def send_webhook_message(webhook_url, embeds=None, content=None, username="System Logger", files=None):
    """Sends a message to a Discord webhook."""
    if not webhook_url:
        print("WARNING: Webhook URL is not configured. Cannot send message.")
        return

    payload = {
        "username": username,
    }
    if embeds:
        payload["embeds"] = embeds
    if content:
        payload["content"] = content
    
    # Discord webhooks sending files require a different Content-Type header
    # and the JSON payload needs to be in a 'payload_json' field of a multipart/form-data request.
    data_payload = None
    if files:
        # If files are being sent, the main JSON payload goes into 'payload_json' field
        data_payload = {'payload_json': json.dumps(payload)} 
        headers = {} # Requests handles Content-Type for multipart/form-data when 'files' arg is used
    else:
        # No files, send a standard JSON POST request
        data_payload = json.dumps(payload)
        headers = {"Content-Type": "application/json"}
        
    try:
        response = requests.post(webhook_url, headers=headers, data=data_payload, files=files, timeout=15)
        response.raise_for_status() # Raise an exception for HTTP errors (4xx or 5xx)
        print(f"Webhook sent successfully to {webhook_url}")
    except requests.exceptions.RequestException as e:
        print(f"ERROR sending webhook to {webhook_url}: {e}")
        # Optional: send this error to a monitoring tool or internal error log.


# --- Socket.IO Event Handlers (Real-time communication with client-side JS) ---

@socketio.on('connect')
def handle_connect():
    client_ip = request.remote_addr # This is the client's public IP connecting to THIS Render server
    user_agent = request.headers.get('User-Agent', 'Unknown User-Agent')
    print(f'Client connected: {request.sid} from {client_ip} ({user_agent})')
    # No Discord notification here; we wait for 'register_session' after successful login

@socketio.on('disconnect')
def handle_disconnect():
    client_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', 'Unknown User-Agent')
    print(f'Client disconnected: {request.sid} from {client_ip} ({user_agent})')

    disconnected_username = None
    disconnected_session_id = None

    # Find which user/session this socket_id belonged to
    for username, sessions in list(active_user_sessions.items()): # Use list() to allow safe modification during iteration
        for session_id, session_data in list(sessions.items()):
            if session_data['socket_id'] == request.sid:
                disconnected_username = username
                disconnected_session_id = session_id
                break
        if disconnected_username:
            break
    
    if disconnected_username and disconnected_session_id:
        if disconnected_username in active_user_sessions and disconnected_session_id in active_user_sessions[disconnected_username]:
            del active_user_sessions[disconnected_username][disconnected_session_id]
            print(f"Removed session {disconnected_session_id} for user {disconnected_username} due to disconnect.")

        # If no other sessions remain for this user, they are truly offline
        if disconnected_username not in active_user_sessions or not active_user_sessions[disconnected_username]: 
            if disconnected_username in active_user_sessions: # Ensure the key exists before deleting
                del active_user_sessions[disconnected_username]
            if disconnected_username in last_ping_times:
                del last_ping_times[disconnected_username]
            
            print(f"User {disconnected_username} is now fully offline.")
            # Notify Discord that the user has fully disconnected
            embed = create_embed(
                "🔴 User Disconnected",
                f"User `{disconnected_username}` has disconnected from the site.",
                0xFF0000, # Red
                [
                    {"name": "Client IP Address (to Flask)", "value": client_ip, "inline": True},
                    {"name": "User Agent", "value": user_agent[:250], "inline": False} # Truncate UA for embed limit
                ]
            )
            send_webhook_message(SITE_GENERAL_ACTIVITY_WEBHOOK_URL, embeds=[embed])
        else:
            print(f"User {disconnected_username} has other active sessions. No full offline notification.")
    else:
        print(f"Disconnected socket {request.sid} was not an active registered session.")

@socketio.on('register_session')
def handle_register_session(data):
    """
    Client sends this after successful login to register its WebSocket session.
    data should contain: {username, userID, sessionId, userAgent}
    """
    username = data.get('username')
    userID = data.get('userID')
    session_id = data.get('sessionId') # A unique ID generated by client for its session

    client_ip = request.remote_addr # The public IP of the client connecting to this Render service
    user_agent_from_client = data.get('userAgent', 'N/A')
    
    if not username or not session_id:
        print(f"Missing username or sessionId in register_session data from {request.sid}. Data: {data}")
        emit('session_registered', {'status': 'error', 'message': 'Missing data.'}, room=request.sid)
        return

    # Security check: Ensure the user's credentials match the whitelist
    user_valid = any(
        user_entry.get('username') == username and user_entry.get('userID') == userID
        for user_entry in whitelist_data
    )
    
    if not user_valid:
        print(f"SECURITY ALERT: Invalid registration attempt from `{username}` (ID: {userID}) session `{session_id}`. Blocking.")
        emit('session_registered', {'status': 'error', 'message': 'Invalid registration credentials.'}, room=request.sid)
        return

    # Add to active sessions dictionary
    if username not in active_user_sessions:
        active_user_sessions[username] = {}
    active_user_sessions[username][session_id] = {
        'socket_id': request.sid,
        'ip_address': client_ip, 
        'user_agent': user_agent_from_client
    }
    
    last_ping_times[username] = time.time()
    join_room(username) # Flask-SocketIO room for easy targeting of specific user's sessions
    
    print(f"User `{username}` (ID: {userID}) session `{session_id}` registered with socket `{request.sid}`. Client IP: {client_ip}.")

    # Notify Discord that a user has connected
    embed = create_embed(
        "🟢 User Connected",
        f"User `{username}` (ID: `{userID}`) Has Been Connected.. Awaiting Commands.",
        0x00FF00, # Green
        [
            {"name": "Client IP Address (to Flask)", "value": client_ip, "inline": True},
            {"name": "User Agent (from client)", "value": user_agent_from_client[:250], "inline": False} # Truncate UA for embed limit
        ]
    )
    send_webhook_message(SITE_GENERAL_ACTIVITY_WEBHOOK_URL, embeds=[embed])
    
    emit('session_registered', {'status': 'success', 'message': 'Session registered.'}, room=request.sid)

@socketio.on('user_disconnected_session')
def handle_user_explicit_disconnect(data):
    """
    Client explicitly disconnects (e.g., from logout button).
    This allows a graceful removal and notification even if standard 'disconnect' might fire later.
    """
    username = data.get('username')
    session_id = data.get('sessionId')
    
    if username in active_user_sessions and session_id in active_user_sessions[username]:
        # Perform similar cleanup as handle_disconnect, but ensure no double-notifications
        client_ip = active_user_sessions[username][session_id]['ip_address']
        user_agent = active_user_sessions[username][session_id]['user_agent']
        
        del active_user_sessions[username][session_id]
        print(f"Explicit disconnect received for session {session_id} for user {username}.")

        # If no other sessions remain for this user, they are truly offline
        if not active_user_sessions[username]: # No sessions left
            del active_user_sessions[username]
            if username in last_ping_times:
                del last_ping_times[username]
            print(f"User {username} explicitly logged out. All sessions ended.")
            embed = create_embed(
                "🟠 User Logged Out",
                f"User `{username}` explicitly logged out and disconnected.",
                0xFFA500, # Orange
                [
                    {"name": "Client IP Address (to Flask)", "value": client_ip, "inline": True},
                    {"name": "User Agent", "value": user_agent[:250], "inline": False}
                ]
            )
            send_webhook_message(SITE_GENERAL_ACTIVITY_WEBHOOK_URL, embeds=[embed])
        else:
            print(f"User {username} has other active sessions. No full offline notification.")
    else:
        print(f"Received explicit disconnect for non-existent session {session_id} or user {username}.")


@socketio.on('ping_from_client')
def handle_ping(data):
    """Client sends a periodic ping to keep session active and update presence."""
    username = data.get('username')
    session_id = data.get('sessionId')
    
    # Validate the session before updating ping time
    if username and session_id \
        and username in active_user_sessions \
        and session_id in active_user_sessions[username] \
        and active_user_sessions[username][session_id]['socket_id'] == request.sid:
            last_ping_times[username] = time.time()
            # print(f"Ping received from {username} (session {session_id})") # Too verbose for logs
    else:
        print(f"WARNING: Ping received from an unrecognized or invalid session {session_id} for user {username}. Socket ID: {request.sid}")


# --- Endpoint for Discord Bot to send commands to clients ---
@app.route('/api/discord-command', methods=['POST'])
def discord_command_api():
    data = request.json
    target_username = data.get('target_username')
    command = data.get('command')
    args = data.get('args', {})

    if not target_username or not command:
        return jsonify({"status": "error", "message": "Missing target_username or command in Discord bot request."}), 400

    # Check if the target user is currently online with any active sessions
    if target_username not in active_user_sessions or not active_user_sessions[target_username]:
        return jsonify({"status": "error", "message": f"User `{target_username}` is not online or has no active sessions."}), 404

    try:
        # Emit the command to all active sessions (browser tabs) for this target user.
        # The 'room' parameter ensures only sessions belonging to 'target_username' receive the command.
        socketio.emit('discord_command', {'command': command, 'args': args}, room=target_username)
        
        # Log this command action to Discord via webhook (for auditing)
        embed = create_embed(
            f"⚡ Command Sent: .{command}",
            f"Command `.{command}` successfully dispatched to all active sessions of user `{target_username}`.",
            0x00BFFF, # Light Blue
            [{"name": "Arguments", "value": json.dumps(args), "inline": False}]
        )
        send_webhook_message(SITE_GENERAL_ACTIVITY_WEBHOOK_URL, embeds=[embed])

        return jsonify({"status": "success", "message": f"Command `{command}` sent to active sessions for `{target_username}`."}), 200
    except Exception as e:
        print(f"ERROR: Failed to emit command `{command}` to `{target_username}` room: {e}")
        return jsonify({"status": "error", "message": f"Failed to send command to client via Socket.IO: {str(e)}"}), 500

# --- Endpoint for retrieving online users for the bot ---
@app.route('/api/online-users', methods=['GET'])
def get_online_users():
    online_list = []
    # Define a timeout for 'active' status (e.g., 60 seconds).
    # If the client PINGs every 30s, 60s gives a reasonable grace period.
    online_timeout = 60 
    
    current_time = time.time()
    
    # Filter based on last ping time and active Socket.IO sessions
    users_to_check = list(last_ping_times.keys())
    
    for username in users_to_check:
        if (current_time - last_ping_times[username]) < online_timeout \
           and username in active_user_sessions \
           and active_user_sessions[username]: # Ensure user has active sockets
             online_list.append({"username": username})
        else:
            # If a user's last ping is too old or no active sockets, consider them offline
            if username in active_user_sessions:
                # This could be a proactive cleanup of zombie sessions if disconnect wasn't graceful
                # For safety, let the actual 'disconnect' handler perform removal.
                pass 
            if username in last_ping_times:
                # We can remove from last_ping_times if they're considered timed out,
                # so future .Online calls are accurate.
                del last_ping_times[username]
                print(f"User {username} timed out as online due to inactivity.")
                # We don't send a disconnect webhook here; it's handled by handle_disconnect.
            
    return jsonify({"status": "success", "online_users": online_list}), 200

# --- Socket.IO Event Handler for Client Sending Data Back to Bot (via Flask) ---
@socketio.on('client_data_to_bot')
def handle_client_data_to_bot(data):
    """
    Client sends data (e.g., screenshot, notes, stats) in response to a bot command.
    data should contain: {username, userID, sessionId, command, payload, format}
    """
    username = data.get('username')
    command = data.get('command')
    payload = data.get('payload') # The actual data
    data_format = data.get('format', 'text') # e.g., 'text', 'base64_image'
    
    if not username or not command or payload is None: # payload can be an empty string, so 'is not None'
        print(f"Missing required fields for client_data_to_bot from {request.sid}. Data: {data}")
        emit('bot_data_receipt', {'status': 'error', 'message': 'Missing data.'}, room=request.sid)
        return

    # Basic security check: ensure the session sending data is known and active for the user
    is_valid_session = False
    if username in active_user_sessions:
        for session_info in active_user_sessions[username].values():
            if session_info['socket_id'] == request.sid:
                is_valid_session = True
                break
    if not is_valid_session:
        print(f"SECURITY ALERT: Unauthorized client_data_to_bot attempt from unknown session {request.sid} or user {username}. Data: {data}")
        emit('bot_data_receipt', {'status': 'error', 'message': 'Unauthorized data submission.'}, room=request.sid)
        return

    print(f"Received data for command `{command}` from `{username}`. Format: `{data_format}`.")

    embeds_to_send = []
    files_to_send = None # Used for screenshots

    if data_format == 'text':
        embed = create_embed(
            f"🤖 Command Result: .{command} for {username}",
            f"Here is the data requested for user `{username}` via command `.{command}`:\n```json\n{payload[:1900]}\n```", # Truncate for embed limit
            0xADD8E6, # Light Blue
            footer_text=f"Requested by Discord command. User ID: {data.get('userID', 'N/A')} | Session: {data.get('sessionId', 'N/A')}"
        )
        embeds_to_send.append(embed)
    elif data_format == 'image' and isinstance(payload, str) and payload.startswith('data:image'):
        try:
            header, base64_data = payload.split(',', 1)
            import base64
            img_bytes = base64.b64decode(base64_data)
            
            # Check size before attempting to attach. Discord webhook limit is 8MB per file.
            if len(img_bytes) < 8 * 1024 * 1024: 
                # Create a BytesIO object so requests can treat it as a file
                from io import BytesIO
                image_file = BytesIO(img_bytes)
                
                # 'files' parameter in requests.post expects tuples: (filename, file_like_object, content_type)
                files_to_send = {'file': (f'screenshot_{username}_{datetime.now().strftime("%Y%m%d%H%M%S")}.png', image_file, 'image/png')}
                
                embed = create_embed(
                    f"📸 Screenshot Captured for {username}",
                    f"A screenshot was captured for user `{username}` in response to command `.{command}`.",
                    0xCCCC00, # Yellowish
                    footer_text="Image attached."
                )
                embeds_to_send.append(embed)
            else:
                embed = create_embed(
                    f"📸 Screenshot Captured for {username}",
                    f"A screenshot was captured for user `{username}`, but it was too large ({len(img_bytes)/1024/1024:.2f} MB) to upload as a file directly to Discord.",
                    0xCCCC00, 
                    footer_text="Consider optimizing image size or using an external image hosting service."
                )
                embeds_to_send.append(embed)
        except Exception as img_e:
            print(f"ERROR processing screenshot for {username}: {img_e}")
            embed = create_embed(
                f"📸 Screenshot Error for {username}",
                f"Failed to process screenshot for user `{username}` due to an error: `{str(img_e)}`.",
                0xFF0000, 
                footer_text="The screenshot could not be delivered."
            )
            embeds_to_send.append(embed)
    else:
        # Default handling for unknown formats or invalid data
        embed = create_embed(
            f"🤖 Command Result (Misc Data): .{command} for {username}",
            f"Received unrecognized format or invalid payload from user `{username}`. Format: `{data_format}`. \nPayload summary:\n```\n{str(payload)[:1000]}\n```",
            0xFF8C00 # Dark Orange for warnings/unknowns
        )
        embeds_to_send.append(embed)

    if embeds_to_send or files_to_send:
        send_webhook_message(SITE_GENERAL_ACTIVITY_WEBHOOK_URL, embeds=embeds_to_send, files=files_to_send)
        emit('bot_data_receipt', {'status': 'success', 'message': 'Data forwarded to Discord.'}, room=request.sid)
    else:
        emit('bot_data_receipt', {'status': 'error', 'message': 'No valid data or format to forward for this command.'}, room=request.sid)


# --- Flask Routes for Serving Static Files (including website/index.html) ---
# Although your primary index.html will be from GitHub Pages, Render also deploys
# these static files. This allows the backend to also serve 'website/Whitelist.json'.
# The main '/' route is less relevant when served from GH Pages, but good for direct testing of backend.

@app.route('/')
def serve_root():
    """Serves a simple message or directly your index.html from 'website' folder."""
    # Since index.html will be on GitHub Pages, this root route is mostly for a sanity check
    # when accessing your Render backend directly.
    return "This is the backend server for your Private System. Connect via Socket.IO."
    # If you later decide to serve the web UI FROM Render (instead of GitHub Pages),
    # you could change this to: return render_template('index.html')


@app.route('/website/<path:filename>')
def serve_website_static_files(filename):
    """Serves static files (like Whitelist.json) from the 'website' folder."""
    # This route specifically makes files inside the `website` directory available
    # under the `/website/` URL path on your Render backend.
    return send_from_directory(app.static_folder, filename)


# --- Running the Flask Server ---
if __name__ == '__main__':
    # Determine host and port based on environment.
    # On Render, $PORT environment variable is provided. Locally, use values from .env.
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", 5000))
    
    print(f"Starting Flask-SocketIO backend server on {host}:{port}")
    
    # When deploying to production (like Render), a WSGI server like Gunicorn is used
    # (configured in Render's Start Command).
    # For local development with Flask's built-in server (when you run `python app.py` directly),
    # use `socketio.run`.
    # `allow_unsafe_werkzeug=True` is only for local development, never for public production.
    socketio.run(app, host=host, port=port, allow_unsafe_werkzeug=True, debug=True)
