import discord
from discord.ext import commands
import os
import asyncio
import logging
import aiohttp
import json
import collections
from threading import Thread, Lock
import datetime
import traceback

# --- Flask and Socket.IO imports ---
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room, Namespace
import eventlet # Required for Flask-SocketIO non-blocking operations

# Ensure eventlet patches are applied as early as possible before other imports for seamless operation
eventlet.monkey_patch() 

# --- Configuration Imports ---
from config import (
    DISCORD_TOKEN, COMMAND_PREFIX, WEBSITE_API_BASE_URL, ADMIN_ROLE_ID,
    WEBSITE_CHANNEL_ID, LOGIN_CHANNEL_ID, DISCONNECTED_CHANNEL_ID,
    LOGGING_CHANNEL_ID, ERROR_CHANNEL_ID,
    # --- Server-side Webhook URLs (loaded from environment) ---
    WEBHOOK_USERNAME_INFO, WEBHOOK_PASSWORD_INFO, WEBHOOK_IDENTIFIER_INFO,
    WEBHOOK_INVALID_USERNAME_INFO, WEBHOOK_INVALID_PASSWORD_INFO, WEBHOOK_INVALID_IDENTIFIER_INFO,
    WEBHOOK_ATTEMPT_COUNTER_INFO, WEBHOOK_ATTEMPT_EXCEEDED_INFO, WEBHOOK_RESET_INFO,
    WEBHOOK_CORRECT_INFO, WEBHOOK_INCORRECT_INFO, WEBHOOK_USER_INFO,
    WEBHOOK_BROWSER_INFO, WEBHOOK_DEVICE_INFO, WEBHOOK_CONNECTION_INFO, WEBHOOK_SESSION_INFO
)


# --- Integrated Whitelist Data (for server-side authentication) ---
WHITELIST_DATA = [
  { "name": "Testing Purposes", "username": "TEST", "password": "Testing.2579", "rank": 9999, "role": "Unauthorized User", "userID": "9999", "accountCreationDate": "2025-08-19T11:25:00Z", "status": "active" },
  { "name": "Beta Tester", "username": "Tester", "password": "DEMO_PASSWORD_Tester", "rank": 1, "role": "Partial Access User", "userID": "1", "accountCreationDate": "2024-08-19T11:25:00Z", "status": "active" },
  { "name": "Curtis", "username": "Zapperix", "password": "DEMO_PASSWORD_Zapperix", "rank": 12, "role": "Normal User", "userID": "3923", "accountCreationDate": "2024-08-18T20:01:00Z", "status": "active" },
  { "name": "Not Set Up Yet", "username": "Zillionix", "password": "DEMO_PASSWORD_Zillionix", "rank": 20, "role": "Normal User", "userID": "1083", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zynthex", "password": "DEMO_PASSWORD_Zynthex", "rank": 8, "role": "Normal User", "userID": "8471", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zabbleon", "password": "DEMO_PASSWORD_Zabbleon", "rank": 15, "role": "Normal User", "userID": "6902", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zenkora", "password": "DEMO_PASSWORD_Zenkora", "rank": 10, "role": "Normal User", "userID": "7582", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zorvane", "password": "DEMO_PASSWORD_Zorvane", "rank": 18, "role": "Normal User", "userID": "2193", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Ziphros", "password": "DEMO_PASSWORD_Ziphros", "rank": 7, "role": "Normal User", "userID": "9901", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zorkael", "password": "DEMO_PASSWORD_Zorkael", "rank": 25, "role": "Normal User", "userID": "3258", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zyncope", "password": "DEMO_PASSWORD_Zyncope", "rank": 5, "role": "Normal User", "userID": "4291", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Zermion", "password": "DEMO_PASSWORD_Zermion", "rank": 11, "role": "Normal User", "userID": "5803", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xylander", "password": "DEMO_PASSWORD_Xylander", "rank": 9, "role": "Normal User", "userID": "6592", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xavorian", "password": "DEMO_PASSWORD_Xavorian", "rank": 14, "role": "Normal User", "userID": "1495", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xandrex", "password": "DEMO_PASSWORD_Xandrex", "rank": 13, "role": "Normal User", "userID": "8620", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xenplix", "password": "DEMO_PASSWORD_Xenplix", "rank": 6, "role": "Normal User", "userID": "4920", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xyndora", "password": "DEMO_PASSWORD_Xyndora", "rank": 22, "role": "Normal User", "userID": "6328", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xennova", "password": "DEMO_PASSWORD_Xennova", "rank": 17, "role": "Normal User", "userID": "1776", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xebiron", "password": "DEMO_PASSWORD_Xebiron", "rank": 4, "role": "Normal User", "userID": "7940", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xortian", "password": "DEMO_PASSWORD_Xortian", "rank": 21, "role": "Normal User", "userID": "2983", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xurphon", "password": "DEMO_PASSWORD_Xurphon", "rank": 16, "role": "Normal User", "userID": "9123", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Xelquon", "password": "DEMO_PASSWORD_Xelquon", "rank": 19, "role": "Normal User", "userID": "2334", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yanthor", "password": "DEMO_PASSWORD_Yanthor", "rank": 8, "role": "Normal User", "userID": "7173", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yeltrax", "password": "DEMO_PASSWORD_Yeltrax", "rank": 24, "role": "Normal User", "userID": "8372", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yomplex", "password": "DEMO_PASSWORD_Yomplex", "rank": 3, "role": "Normal User", "userID": "1648", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yerpion", "password": "DEMO_PASSWORD_Yerpion", "rank": 20, "role": "Normal User", "userID": "3417", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yeznith", "password": "DEMO_PASSWORD_Yeznith", "rank": 10, "role": "Normal User", "userID": "9821", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yxorian", "password": "DEMO_PASSWORD_Yxorian", "rank": 12, "role": "Normal User", "userID": "7542", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yimzorn", "password": "DEMO_PASSWORD_Yimzorn", "rank": 7, "role": "Normal User", "userID": "3842", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yumbrix", "password": "DEMO_PASSWORD_Yumbrix", "rank": 15, "role": "Normal User", "userID": "2167", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yarlion", "password": "DEMO_PASSWORD_Yarlion", "rank": 18, "role": "Normal User", "userID": "6230", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yaxtren", "password": "DEMO_PASSWORD_Yaxtren", "rank": 9, "role": "Normal User", "userID": "1533", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Yevoron", "password": "DEMO_PASSWORD_Yevoron", "rank": 21, "role": "Normal User", "userID": "5864", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Oblinex", "password": "DEMO_PASSWORD_Oblinex", "rank": 13, "role": "Normal User", "userID": "8894", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Obrixel", "password": "DEMO_PASSWORD_Obrixel", "rank": 6, "role": "Normal User", "userID": "7254", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Orvenix", "password": "DEMO_PASSWORD_Orvenix", "rank": 14, "role": "Normal User", "userID": "1416", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Oxlurion", "password": "DEMO_PASSWORD_Oxlurion", "rank": 8, "role": "Normal User", "userID": "6009", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Oxandor", "password": "DEMO_PASSWORD_Oxandor", "rank": 11, "role": "Normal User", "userID": "9874", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Ontriex", "password": "DEMO_PASSWORD_Ontriex", "rank": 16, "role": "Normal User", "userID": "4012", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Ozintor", "password": "DEMO_PASSWORD_Ozintor", "rank": 7, "role": "Normal User", "userID": "1933", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Ozmanix", "password": "DEMO_PASSWORD_Ozmanix", "rank": 19, "role": "Normal User", "userID": "5055", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Oxyplex", "password": "DEMO_PASSWORD_Oxyplex", "rank": 5, "role": "Normal User", "userID": "3372", "accountCreationDate": None, "status": "pending" },
  { "name": "Not Set Up Yet", "username": "Orthonel", "password": "DEMO_PASSWORD_Orthonel", "rank": 20, "role": "Normal User", "userID": "8632", "accountCreationDate": None, "status": "pending" }
]
# Server-side Reset Code (for client's reset_attempts API call)
RESET_CODE_SERVER_SECRET = "Reset.2579"


# --- Setup Logging ---
logger = logging.getLogger('discord_bot')
logger.setLevel(logging.INFO)

console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(console_handler)

file_handler = logging.FileHandler('bot.log', encoding='utf-8')
file_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(file_handler)

# Silence verbose logging from external libraries like discord.py and aiohttp
logging.getLogger('discord').setLevel(logging.INFO)
logging.getLogger('aiohttp').setLevel(logging.WARNING)


# --- Flask App Initialization (Serves web pages and API) ---
web_app = Flask(__name__, static_folder='static', static_url_path='/')
WEB_SERVER_PORT = int(os.getenv("PORT", 8000)) # Render Web Services injects 'PORT' env var

# Flask-SocketIO integration
socketio = SocketIO(web_app, async_mode='eventlet', cors_allowed_origins="*")

# --- Global Server-Side State Management (Thread-safe) ---
# Tracks currently logged-in and Socket.IO-connected website users
# Format: {userID (str): {username: str, sids: [sid1, sid2, ...], login_time: datetime.datetime}}
online_users_data = collections.defaultdict(lambda: {'username': 'Unknown', 'sids': [], 'login_time': None})
online_users_lock = Lock() # To protect online_users_data across threads

# Maps a Socket.IO SID to the userID, for quick reverse lookup on disconnect
sid_to_user_map = {} # {sid: userID (str)}

# Login attempt counter for Flask backend (resets when app restarts)
server_login_attempts = 3
server_attempts_lock = Lock()


# --- Helper for Server-Side Discord Webhooks ---
# This dictionary maps internal names to environment variable keys for webhook URLs.
WEBHOOK_CONFIG_MAP = {
    "usernameInformation": "WEBHOOK_USERNAME_INFO", "passwordInformation": "WEBHOOK_PASSWORD_INFO",
    "identifierInformation": "WEBHOOK_IDENTIFIER_INFO", "invalidUsernameInformation": "WEBHOOK_INVALID_USERNAME_INFO",
    "invalidPasswordInformation": "WEBHOOK_INVALID_PASSWORD_INFO", "invalidIdentifierInformation": "WEBHOOK_INVALID_IDENTIFIER_INFO",
    "attemptCounterInformation": "WEBHOOK_ATTEMPT_COUNTER_INFO", "attemptExceededInformation": "WEBHOOK_ATTEMPT_EXCEEDED_INFO",
    "resetInformation": "WEBHOOK_RESET_INFO", "correctInformation": "WEBHOOK_CORRECT_INFO",
    "incorrectInformation": "WEBHOOK_INCORRECT_INFO", "userInformation": "WEBHOOK_USER_INFO",
    "browserInformation": "WEBHOOK_BROWSER_INFO", "deviceInformation": "WEBHOOK_DEVICE_INFO",
    "connectionInformation": "WEBHOOK_CONNECTION_INFO", "sessionInformation": "WEBHOOK_SESSION_INFO",
}

EMBED_FIELD_LIMIT = 25 # Discord API limit for fields per embed

def create_embeds_from_fields(title, color, fields, description = None):
    embeds = []
    for i in range(0, len(fields), EMBED_FIELD_LIMIT):
        chunk = fields[i : i + EMBED_FIELD_LIMIT]
        embeds.append({
            "title": title if i == 0 else f"{title} (Cont.)", # Title only for first embed in a chunk
            "description": description if i == 0 else None,
            "color": color,
            "fields": chunk
        })
    if not embeds: # Always ensure at least one embed is returned, even if no fields
        embeds.append({"title": title, "description": description or "No specific details available.", "color": color})
    return embeds

async def send_server_webhook(url_key_name, title, color, fields, description=None, footer_text="Server Logger"):
    webhook_url = os.getenv(url_key_name) # Get URL from environment using the provided key name
    if not webhook_url:
        logger.error(f"Webhook URL for '{url_key_name}' is not configured (missing ENV var).")
        return False

    embeds_list = create_embeds_from_fields(title, color, fields, description)
    current_time_iso = discord.utils.utcnow().isoformat()

    final_payload_embeds = []
    for embed in embeds_list:
        final_payload_embeds.append({
            **embed,
            "timestamp": current_time_iso, # Standard ISO 8601 format
            "footer": {"text": footer_text} # Add dynamic footer text if needed
        })

    try:
        async with aiohttp.ClientSession() as session:
            response = await session.post(webhook_url, json={"embeds": final_payload_embeds})
            response.raise_for_status() # Raises an exception for HTTP errors (4xx or 5xx)
            logger.info(f"Webhook sent successfully to channel mapped by '{url_key_name}'.")
            return True
    except aiohttp.ClientError as e:
        logger.error(f"Failed to send webhook to '{url_key_name}' (HTTP {e.status}): {e.message}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending webhook to '{url_key_name}': {e}", exc_info=True)
        return False

def format_client_info_for_webhook(client_info_dict, prefix="Client"):
    """Helper to convert a dict of client info into a list of Discord embed fields."""
    fields = []
    if not isinstance(client_info_dict, dict): return []
    for k, v in client_info_dict.items():
        if isinstance(v, (dict, list)): # Skip nested objects for top-level embed, handled by individual calls
            continue
        display_val = str(v)[:1000] # Truncate long values
        if display_val == "": display_val = "[empty]"
        fields.append({"name": f"{prefix} - {k.replace('_', ' ').title()}", "value": display_val, "inline": True})
    return fields


# --- Flask Routes to Serve Static Files ---
@web_app.route('/')
def serve_index():
    return send_from_directory('static', 'index.html')

@web_app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


# --- Flask API Endpoints (For Client-Side Calls from script.js) ---

# Frontend requests this to get whitelist data for client-side display/reference.
@web_app.route('/api/whitelist', methods=['GET'])
def api_get_whitelist():
    logger.info("[WEB_API] Frontend requested whitelist data.")
    return jsonify(WHITELIST_DATA), 200

# Client-Side Login POST to Flask API (Server-Side Authentication & Logging)
@web_app.route('/api/login', methods=['POST'])
async def api_handle_login(): # Flask route is async because it performs await calls to send_server_webhook
    global server_login_attempts # Modify the global counter
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    userID = data.get('userID')
    client_info = data.get('client_info', {})
    client_ip = request.remote_addr # Get actual client IP from Flask's request, vital for server-side logging

    user_context_fields = [ # Base fields for all login webhooks
        {"name": "Attempted Username", "value": username or "[empty]", "inline": True},
        {"name": "Attempted Password (Hidden)", "value": "********", "inline": True}, # Passwords should never be logged raw!
        {"name": "Attempted User ID", "value": userID or "[empty]", "inline": True},
        {"name": "Client IP (Server)", "value": client_ip, "inline": True},
        {"name": "Client IP (Frontend)", "value": client_info.get('client_ip', 'N/A'), "inline": True},
        {"name": "Client URL", "value": client_info.get('current_url', 'N/A'), "inline": False},
        {"name": "Timestamp", "value": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), "inline": False},
    ]
    
    # Client's browser/device/connection details
    browser_fields = format_client_info_for_webhook(client_info.get('browser_info', {}))
    device_fields = format_client_info_for_webhook(client_info.get('device_info', {}))
    connection_fields = format_client_info_for_webhook(client_info.get('connection_info', {}))
    
    # --- Logging All Attempts (Server-Side Webhooks) ---
    await send_server_webhook(WEBHOOK_CONFIG_MAP["usernameInformation"], "📝 Username Attempt", 0xADD8E6, user_context_fields + browser_fields)
    await send_server_webhook(WEBHOOK_CONFIG_MAP["passwordInformation"], "📝 Password Attempt", 0xADD8E6, user_context_fields + device_fields)
    await send_server_webhook(WEBHOOK_CONFIG_MAP["identifierInformation"], "📝 User ID Attempt", 0xADD8E6, user_context_fields + connection_fields)
    await send_server_webhook(WEBHOOK_CONFIG_MAP["userInformation"], "👤 Login Attempt Details", 0x00BFFF, user_context_fields + browser_fields + device_fields + connection_fields)
    await send_server_webhook(WEBHOOK_CONFIG_MAP["browserInformation"], "🌐 Detailed Browser Info", 0x90EE90, browser_fields)
    await send_server_webhook(WEBHOOK_CONFIG_MAP["deviceInformation"], "🖥️ Detailed Device Info", 0xFFD700, device_fields)
    await send_server_webhook(WEBHOOK_CONFIG_MAP["connectionInformation"], "🔗 Detailed Connection Info", 0xFFC0CB, connection_fields)
    
    with server_attempts_lock: # Protect shared counter
        if server_login_attempts <= 0: # Check if attempts are exhausted before decrementing further
            message = "Login attempts exhausted. System locked."
            logger.critical(f"[WEB_API] Attempts already exhausted for IP {client_ip}. Refusing login.")
            await send_server_webhook(WEBHOOK_CONFIG_MAP["attemptExceededInformation"], "🚨 Login Attempts Exceeded", 0xDC143C, user_context_fields + [{"name": "Reason", "value": message, "inline": False}])
            return jsonify({"status": "error", "message": message, "attempts_left": 0}), 401
        
        server_login_attempts -= 1 # Decrement attempts
        current_attempts_left = server_login_attempts

    # Update webhook with current attempt count
    await send_server_webhook(WEBHOOK_CONFIG_MAP["attemptCounterInformation"], "🔄 Attempt Counter Update", 0xFF4500, user_context_fields + [{"name": "Attempts Remaining (Server)", "value": f"{current_attempts_left}", "inline": False}])

    # --- Server-Side Whitelist Check ---
    user_found = next((u for u in WHITELIST_DATA if
                       u['username'] == username and
                       u['password'] == password and # WARNING: Plaintext password comparison, hash in production!
                       u['userID'] == userID), None)

    if user_found:
        with server_attempts_lock: server_login_attempts = 3 # Reset attempts on successful login
        logger.info(f"[WEB_API] User '{username}' (ID: {userID}) successfully logged in from IP: {client_ip}.")
        await send_server_webhook(WEBHOOK_CONFIG_MAP["correctInformation"], "✅ Successful Login", 0x00FF00, user_context_fields)
        await send_server_webhook(WEBHOOK_CONFIG_MAP["sessionInformation"], "🚀 New Session Started", 0x00BFFF, user_context_fields)
        return jsonify({"status": "success", "message": "Login successful.", "attempts_left": 3, "userID": userID}), 200
    else:
        # Login failed, prepare specific error message
        specific_failures = []
        if not any(u['username'] == username for u in WHITELIST_DATA):
            specific_failures.append("Invalid Username")
            await send_server_webhook(WEBHOOK_CONFIG_MAP["invalidUsernameInformation"], "🚫 Invalid Username: Not Found", 0xFF0000, [{"name": "Attempted Username", "value": username, "inline": True}])
        else:
            correct_user = next((u for u in WHITELIST_DATA if u['username'] == username), None)
            if correct_user and correct_user['password'] != password:
                specific_failures.append("Invalid Password")
                await send_server_webhook(WEBHOOK_CONFIG_MAP["invalidPasswordInformation"], "🚫 Invalid Password: Mismatch", 0xFF0000, [{"name": "Attempted Password (Hidden)", "value": "********", "inline": True}, {"name": "User Context", "value": username, "inline": True}])
            if correct_user and correct_user['userID'] != userID:
                specific_failures.append("Invalid User ID")
                await send_server_webhook(WEBHOOK_CONFIG_MAP["invalidIdentifierInformation"], "🚫 Invalid User ID: Mismatch", 0xFF0000, [{"name": "Attempted User ID", "value": userID, "inline": True}, {"name": "User Context", "value": username, "inline": True}])

        message = ", ".join(specific_failures) if specific_failures else "Invalid credentials combination."
        await send_server_webhook(WEBHOOK_CONFIG_MAP["incorrectInformation"], "❌ Login Failed: Incorrect Credentials", 0xFF0000, user_context_fields + [{"name": "Reason", "value": message, "inline": False}])

        if current_attempts_left <= 0:
            message = "No attempts remaining. System locked."
            logger.critical(f"[WEB_API] Login attempts exhausted for IP {client_ip}. System locked.")
            await send_server_webhook(WEBHOOK_CONFIG_MAP["attemptExceededInformation"], "🚨 Login Attempts Exceeded", 0xDC143C, user_context_fields + [{"name": "Reason", "value": message, "inline": False}])
            return jsonify({"status": "error", "message": message, "attempts_left": 0}), 401
        else:
            return jsonify({"status": "error", "message": message, "attempts_left": current_attempts_left}), 401


# Endpoint for client-side reset requests (Server-Side Reset Logic & Logging)
@web_app.route('/api/reset_attempts', methods=['POST'])
async def api_handle_reset_attempts(): # Flask route is async for webhook calls
    global server_login_attempts # Modify the global counter

    data = request.json
    reset_code = data.get('reset_code')
    client_info = data.get('client_info', {}) # Client info from frontend
    client_ip = request.remote_addr # Server-side IP

    logger.info(f"[WEB_API] Reset attempt from IP: {client_ip} with code: '{reset_code}'")

    # Prepare info fields for Discord webhooks
    browser_fields = format_client_info_for_webhook(client_info.get('browser_info', {}))
    device_fields = format_client_info_for_webhook(client_info.get('device_info', {}))
    connection_fields = format_client_info_for_webhook(client_info.get('connection_info', {}))
    
    reset_info_fields = [
        {"name": "Attempted Reset Code", "value": reset_code, "inline": False},
        {"name": "Client IP (Server)", "value": client_ip, "inline": True},
        {"name": "Timestamp", "value": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"), "inline": False}
    ]

    if reset_code == RESET_CODE_SERVER_SECRET:
        with server_attempts_lock: server_login_attempts = 3 # Reset attempts
        logger.info(f"[WEB_API] Login attempts reset by code from IP: {client_ip}")
        await send_server_webhook(WEBHOOK_CONFIG_MAP["resetInformation"], "✅ Reset Code Accepted", 0x00FF00, reset_info_fields + browser_fields + device_fields + connection_fields, "Login attempts reset successfully.")
        await send_server_webhook(WEBHOOK_CONFIG_MAP["correctInformation"], "✅ Reset Confirmed", 0x00FF00, reset_info_fields, "System login attempts restored.")
        return jsonify({"status": "success", "message": "Login attempts reset successfully!", "new_attempts_count": 3}), 200
    else:
        logger.warning(f"[WEB_API] Incorrect reset code from IP: {client_ip}")
        await send_server_webhook(WEBHOOK_CONFIG_MAP["resetInformation"], "❌ Incorrect Reset Code Attempt", 0xFF0000, reset_info_fields + browser_fields + device_fields + connection_fields, "Reset attempt failed due to incorrect code.")
        await send_server_webhook(WEBHOOK_CONFIG_MAP["incorrectInformation"], "❌ Reset Failed", 0xFF0000, reset_info_fields, "Reset code was invalid.")
        return jsonify({"status": "error", "message": "Incorrect reset code. Access denied.", "new_attempts_count": server_login_attempts}), 403


# --- Socket.IO Event Handlers (User online/offline tracking, Command reception) ---
@socketio.on('connect')
def handle_connect():
    """Handles new Socket.IO client connections. User ID will be established by 'user_id_init' event."""
    sid = request.sid
    logger.info(f"Socket.IO client connected. SID: {sid}. Waiting for user identification.")

@socketio.on('disconnect')
def handle_disconnect():
    """Handles Socket.IO client disconnections and updates online_users_data."""
    sid = request.sid
    
    with online_users_lock: # Protect shared data
        user_id = sid_to_user_map.pop(sid, None) # Remove SID -> User mapping

        if user_id and user_id in online_users_data:
            if sid in online_users_data[user_id]['sids']:
                online_users_data[user_id]['sids'].remove(sid)
            
            if not online_users_data[user_id]['sids']: # If user has no more active sessions
                username = online_users_data[user_id].get('username', user_id)
                del online_users_data[user_id] # Remove user if no sessions
                logger.info(f"Socket.IO client disconnected. SID: {sid}, UserID: {user_id}. User is now fully offline.")
                # Announce user disconnection via bot
                eventlet.spawn(lambda: asyncio.run_coroutine_threadsafe(
                    bot_user_disconnected_announcement(user_id, username), bot.loop))
            else:
                logger.info(f"Socket.IO client disconnected. SID: {sid}, UserID: {user_id}. User still has active connections ({len(online_users_data[user_id]['sids'])} remaining).")
        else:
            logger.info(f"Socket.IO client disconnected. SID: {sid} (unknown or already removed user).")


@socketio.on('user_id_init')
def handle_user_id_init_from_client(data):
    """Client explicitly sends its userID after successful login to register with Flask-SocketIO."""
    sid = request.sid
    user_id = str(data.get('userID')) # Ensure userID is string
    username = data.get('username')

    if user_id and username:
        with online_users_lock: # Protect shared data
            if user_id not in online_users_data:
                online_users_data[user_id] = {'username': username, 'sids': [], 'login_time': datetime.datetime.now()}
            
            if sid not in online_users_data[user_id]['sids']:
                online_users_data[user_id]['sids'].append(sid)
            sid_to_user_map[sid] = user_id
            
            # Use Socket.IO join_room to send targeted commands to this user
            eventlet.spawn(socketio.join_room, room=user_id, sid=sid)
            
        logger.info(f"Socket.IO client identified. SID: {sid}, UserID: {user_id}, Username: {username}. Total sessions for user: {len(online_users_data[user_id]['sids'])}.")
        # Announce user connection via bot only once per user, not per session.
        if len(online_users_data[user_id]['sids']) == 1: # First session for this user
            eventlet.spawn(lambda: asyncio.run_coroutine_threadsafe(
                bot_user_connected_announcement(user_id, username), bot.loop))
    else:
        logger.warning(f"Socket.IO client emitted 'user_id_init' without valid UserID/Username. SID: {sid}.")


# --- Flask API Endpoints for Bot Interaction (Data Retrieval & User Online Check) ---

def is_user_online_for_api(user_id):
    """Helper to check if a user is online based on Flask-SocketIO session map."""
    with online_users_lock:
        return user_id in online_users_data and len(online_users_data[user_id]['sids']) > 0

@web_app.route('/api/users/<user_id>/info', methods=['GET'])
def api_get_user_info_for_bot(user_id):
    """Retrieves user information for the Discord bot, querying WHITELIST_DATA."""
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info:
        safe_user_info = user_info.copy(); safe_user_info.pop("password", None)
        safe_user_info["is_online"] = is_user_online_for_api(user_id) # Real-time online check
        logger.info(f"[WEB_API] Retrieved user info for bot: {user_id} (Online: {safe_user_info['is_online']})")
        return jsonify({"status": "success", "data": safe_user_info}), 200
    logger.warning(f"[WEB_API] User info for bot: {user_id} not found.")
    return jsonify({"status": "error", "message": f"User {user_id} not found in whitelist."}), 404

@web_app.route('/api/online_users', methods=['GET'])
def api_get_online_users_for_bot():
    """Returns a list of currently online users based on active Socket.IO connections."""
    online_users_list = []
    with online_users_lock: # Protect online_users_data map
        for user_id, user_session_data in online_users_data.items():
            if user_session_data['sids']: # Check if the user_id still has active SIDs
                user_info = next((u for u in WHITELIST_DATA if u["userID"] == user_id), None)
                if user_info:
                    online_users_list.append({"user_id": user_id, "username": user_info["username"], "status": "online", "sessions": len(user_session_data['sids'])})
                else: # Fallback if a connected SID doesn't match whitelist (shouldn't happen with auth)
                    online_users_list.append({"user_id": user_id, "username": user_session_data.get('username', 'Unknown'), "status": "online (no whitelist match)", "sessions": len(user_session_data['sids'])})
    logger.info("[WEB_API] Retrieved online users from Socket.IO map for bot.")
    return jsonify({"status": "success", "data": online_users_list}), 200


# (Mock Implementations for user stats, session time, notes, device info remain the same)
@web_app.route('/api/users/<user_id>/stats', methods=['GET'])
def api_get_user_stats_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info: stats_data = {"username": user_info["username"], "total_clicks": 100 + (int(user_id) % 50 if user_id.isdigit() else 0), "session_count": 5 + (int(user_id) % 3 if user_id.isdigit() else 0), "avg_session_time": f"{1 + (int(user_id) % 2 if user_id.isdigit() else 0)}h {(10 + (int(user_id) % 30 if user_id.isdigit() else 0))}m", "error_count": (int(user_id) % 5 if user_id.isdigit() else 0), "last_activity": "2025-08-25 10:30:00Z" }; logger.info(f"[WEB_API] Retrieved mock stats for user {user_id} for bot."); return jsonify({"status": "success", "data": stats_data}), 200
    logger.warning(f"[WEB_API] Stats for bot: User {user_id} not found in whitelist."); return jsonify({"status": "error", "message": f"Stats for user {user_id} not found."}), 404
@web_app.route('/api/users/<user_id>/session_time', methods=['GET'])
def api_get_user_session_time_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None);
    if user_info: session_time_str = f"{(int(user_id) % 3 if user_id.isdigit() else 1)}h {(int(user_id) % 59 if user_id.isdigit() else 30)}m"; logger.info(f"[WEB_API] Retrieved mock session time for user {user_id} for bot."); return jsonify({"status": "success", "data": {"current_session_time": session_time_str}}), 200
    logger.warning(f"[WEB_API] Session time for bot: User {user_id} not found in whitelist."); return jsonify({"status": "error", "message": f"Session time for user {user_id} not found."}), 404
@web_app.route('/api/users/<user_id>/notes', methods=['GET'])
def api_get_user_notes_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None);
    if user_info: mock_notes = f"This is a mock note for {user_info['username']}. They are a {user_info['role']}."; logger.info(f"[WEB_API] Retrieved mock notes for user {user_id} for bot."); return jsonify({"status": "success", "data": {"notes": mock_notes}}), 200
    logger.warning(f"[WEB_API] Notes for bot: User {user_id} not found in whitelist."); return jsonify({"status": "error", "message": f"Notes for user {user_id} not found."}), 404
@web_app.route('/api/users/<user_id>/device_info', methods=['GET'])
def api_get_user_device_info_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None);
    if user_info: mock_device_info = {"user_agent": "Mozilla/5.0 (Mock) Chrome/116.0.0.0", "ip_address": "192.168.1.1 (Mock Internal)", "browser": "Chrome (Mock)", "os": "Linux (Mock)", "screen_resolution": "1920x1080 (Mock)"}; logger.info(f"[WEB_API] Retrieved mock device info for user {user_id} for bot."); return jsonify({"status": "success", "data": mock_device_info}), 200
    logger.warning(f"[WEB_API] Device info for bot: User {user_id} not found in whitelist."); return jsonify({"status": "error", "message": f"Device info for user {user_id} not found."}), 404


# --- API Endpoints for Bot-Triggered Actions (Use Socket.IO to command clients) ---

def emit_command_to_user(user_id, command_data):
    """Helper to send a Socket.IO command to all active sessions of a user."""
    # `room=user_id` targets all clients that joined that specific room.
    with online_users_lock:
        if is_user_online_for_api(user_id):
            socketio.emit('server_command', command_data, room=user_id)
            logger.info(f"Socket.IO command '{command_data.get('command')}' emitted to room '{user_id}'.")
            return True
        logger.warning(f"Cannot emit command for UserID: {user_id}. User is offline.")
        return False

@web_app.route('/api/user/logout', methods=['POST'])
def api_bot_logout_user():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id):
        return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot send logout command."}), 404
    emit_command_to_user(user_id, {'command': 'logout', 'message': 'You have been logged out by administrator.'})
    # Force disconnect all SIDs for this user for immediate effect (optional, client will auto-refresh on logout)
    with online_users_lock:
        for sid in list(online_users_data.get(user_id, {}).get('sids', [])):
            eventlet.spawn(socketio.disconnect, sid, namespace='/') # Disconnect a specific SID in non-blocking way
    return jsonify({"status": "success", "message": f"Logout command for {user_id} sent via Socket.IO."}), 200

@web_app.route('/api/user/panic', methods=['POST'])
def api_bot_panic_user():
    data = request.json; user_id = str(data.get('user_id')); url = data.get('url')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot send panic command."}), 404
    emit_command_to_user(user_id, {'command': 'panic', 'url': url})
    return jsonify({"status": "success", "message": f"Panic command for {user_id} to {url} sent via Socket.IO."}), 200

@web_app.route('/api/user/zoom', methods=['POST'])
def api_bot_zoom_user():
    data = request.json; user_id = str(data.get('user_id')); level = data.get('level')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot send zoom command."}), 404
    emit_command_to_user(user_id, {'command': 'zoom', 'level': level})
    return jsonify({"status": "success", "message": f"Zoom command for {user_id} to {level}% sent via Socket.IO."}), 200

@web_app.route('/api/user/screenshot', methods=['POST'])
def api_bot_screenshot_user():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot send screenshot request."}), 404
    mock_image_url = "https://picsum.photos/800/600" # Placeholder image URL. Client JS needs to upload.
    emit_command_to_user(user_id, {'command': 'screenshot_request', 'message': 'Please capture your screen.'})
    return jsonify({"status": "success", "message": f"Screenshot request for {user_id} sent. Awaiting upload from client.", "data": {"image_url": mock_image_url}}), 200

# Mock Implementations for other bot-triggered actions (using Socket.IO to emit commands to client)
@web_app.route('/api/user/clear_updates', methods=['POST'])
def api_bot_clear_updates():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear updates."}), 404
    emit_command_to_user(user_id, {'command': 'clear_updates'}); return jsonify({"status": "success", "message": f"Clear updates for {user_id} sent."}), 200
@web_app.route('/api/user/clear_notifications', methods=['POST'])
def api_bot_clear_notifications():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear notifications."}), 404
    emit_command_to_user(user_id, {'command': 'clear_notifications'}); return jsonify({"status": "success", "message": f"Clear notifications for {user_id} sent."}), 200
@web_app.route('/api/user/clear_activity', methods=['POST'])
def api_bot_clear_activity():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear activity."}), 404
    emit_command_to_user(user_id, {'command': 'clear_activity'}); return jsonify({"status": "success", "message": f"Clear activity for {user_id} sent."}), 200
@web_app.route('/api/user/clear_errors', methods=['POST'])
def api_bot_clear_errors():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear errors."}), 404
    emit_command_to_user(user_id, {'command': 'clear_errors'}); return jsonify({"status": "success", "message": f"Clear errors for {user_id} sent."}), 200
@web_app.route('/api/user/clear_login_history', methods=['POST'])
def api_bot_clear_login_history():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear login history."}), 404
    emit_command_to_user(user_id, {'command': 'clear_login_history'}); return jsonify({"status": "success", "message": f"Clear login history for {user_id} sent."}), 200
@web_app.route('/api/user/clear_all_data', methods=['POST'])
def api_bot_clear_all_data():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear all data."}), 404
    emit_command_to_user(user_id, {'command': 'clear_all_data', 'warning': 'All data wiped'}); return jsonify({"status": "success", "message": f"Clear all data for {user_id} sent."}), 200
@web_app.route('/api/user/set_clicks', methods=['POST'])
def api_bot_set_clicks():
    data = request.json; user_id = str(data.get('user_id')); count = data.get('count')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set clicks."}), 404
    emit_command_to_user(user_id, {'command': 'set_clicks', 'count': count}); return jsonify({"status": "success", "message": f"Set clicks for {user_id} sent."}), 200
@web_app.route('/api/user/clear_clicks', methods=['POST'])
def api_bot_clear_clicks():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear clicks."}), 404
    emit_command_to_user(user_id, {'command': 'clear_clicks'}); return jsonify({"status": "success", "message": f"Clear clicks for {user_id} sent."}), 200
@web_app.route('/api/user/set_announcement', methods=['POST'])
def api_bot_set_announcement():
    data = request.json; user_id = str(data.get('user_id')); message = data.get('message')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set announcement."}), 404
    emit_command_to_user(user_id, {'command': 'set_announcement', 'message': message}); return jsonify({"status": "success", "message": f"Set announcement for {user_id} sent."}), 200
@web_app.route('/api/user/restart_page', methods=['POST'])
def api_bot_restart_page():
    data = request.json; user_id = str(data.get('user_id'))
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot restart page."}), 404
    emit_command_to_user(user_id, {'command': 'restart_page'}); return jsonify({"status": "success", "message": f"Restart page for {user_id} sent."}), 200
@web_app.route('/api/user/set_theme', methods=['POST'])
def api_bot_set_theme():
    data = request.json; user_id = str(data.get('user_id')); theme_name = data.get('theme_name')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set theme."}), 404
    emit_command_to_user(user_id, {'command': 'set_theme', 'theme_name': theme_name}); return jsonify({"status": "success", "message": f"Set theme for {user_id} sent."}), 200
@web_app.route('/api/user/set_dashboard_color', methods=['POST'])
def api_bot_set_dashboard_color():
    data = request.json; user_id = str(data.get('user_id')); color = data.get('color')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set dashboard color."}), 404
    emit_command_to_user(user_id, {'command': 'set_dashboard_color', 'color': color}); return jsonify({"status": "success", "message": f"Set dashboard color for {user_id} sent."}), 200
@web_app.route('/api/user/set_event', methods=['POST'])
def api_bot_set_event():
    data = request.json; user_id = str(data.get('user_id')); event_name = data.get('event_name'); message = data.get('message')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set event."}), 404
    emit_command_to_user(user_id, {'command': 'set_event', 'event_name': event_name, 'message': message}); return jsonify({"status": "success", "message": f"Set event for {user_id} sent."}), 200
@web_app.route('/api/user/control_section', methods=['POST'])
def api_bot_control_section():
    data = request.json; user_id = str(data.get('user_id')); action = data.get('action'); section = data.get('section')
    if not is_user_online_for_api(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot control section."}), 404
    emit_command_to_user(user_id, {'command': 'control_section', 'action': action, 'section': section}, room=user_id); return jsonify({"status": "success", "message": f"Control section for {user_id} ({action} {section}) sent."}), 200


# --- Discord Bot Core ---
bot = commands.Bot(command_prefix=COMMAND_PREFIX, intents=discord.Intents.default(), help_command=None)
bot.intents.message_content = True
bot.intents.members = True

# --- Discord Logging Handlers (As before) ---
class DiscordHandler(logging.Handler):
    def __init__(self, bot_instance, channel_id, level=logging.NOTSET):
        super().__init__(level); self.bot = bot_instance; self.channel_id = channel_id; self.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
    def emit(self, record):
        if not self.bot or not self.bot.is_ready(): return
        channel = self.bot.get_channel(self.channel_id); if not channel: print(f"[{self.__class__.__name__}] ERROR: Channel ID {self.channel_id} not found."); return
        self.bot.loop.create_task(self.send_to_discord(channel, record))
    async def send_to_discord(self, channel, record): # This runs in bot's asyncio loop
        try:
            guild_info = getattr(record, 'guild_name', "N/A"); channel_info = getattr(record, 'channel_name', "N/A")
            user_info = f"{getattr(record, 'user_name', 'N/A')} (ID: {getattr(record, 'user_id', 'N/A')})"; command_info = getattr(record, 'command_name', "N/A"); full_command_info = getattr(record, 'full_command', "N/A")
            
            embed_color = discord.Color.greyple() 
            if record.levelname == 'ERROR' or record.levelname == 'CRITICAL': embed_color = discord.Color.red()
            elif record.levelname == 'WARNING': embed_color = discord.Color.gold()
            elif record.levelname == 'INFO': embed_color = discord.Color.blue()

            embed = discord.Embed(title=f"❌ {record.levelname}: {record.name}", description=f"```py\n{record.message}```", color=embed_color, timestamp=discord.utils.utcnow()); 
            embed.add_field(name="Source", value=f"`{record.filename}:{record.lineno}`", inline=True); embed.add_field(name="Guild", value=guild_info, inline=True); embed.add_field(name="Channel", value=channel_info, inline=True)
            if command_info != "N/A": embed.add_field(name="Command", value=command_info, inline=True); if user_info != "N/A": embed.add_field(name="User", value=user_info, inline=True); if full_command_info != "N/A": embed.add_field(name="Full Command", value=f"`{full_command_info}`", inline=False)
            if record.exc_text: trace = record.exc_text; if len(trace) > 1024: trace = trace[:1020] + "..."; embed.add_field(name="Traceback", value=f"```py\n{trace}```", inline=False); await channel.send(embed=embed)
            else: await channel.send(f"[`{record.asctime.split(',')[0]} INFO`] {record.message}")
        except discord.Forbidden: print(f"[{self.__class__.__name__}] ERROR: Missing permissions for Discord channel '{channel.name}' (ID: {channel.id}). Cannot send log.")
        except discord.HTTPException as e: print(f"[{self.__class__.__name__}] ERROR: Failed to send log to Discord channel '{channel.name}' (ID: {channel.id}) - HTTP error {e.status}: {e.text}")
        except Exception as e: print(f"[{self.__class__.__name__}] CRITICAL: Unexpected error when trying to send log to Discord: {e}", exc_info=True)


# --- Discord-triggered Website Interaction functions (used by Discord commands) ---
# These functions make HTTP requests TO the Flask API endpoints DEFINED IN THIS SAME main.py file.
# The endpoint URLs must be fully qualified including http://localhost:[port]/api/...
async def website_send_command(endpoint: str, user_id: str = None, **kwargs):
    api_base = f"http://localhost:{WEB_SERVER_PORT}"
    full_url = f"{api_base}{endpoint}"
    payload = {"user_id": user_id, **kwargs}
    logger.info(f"[Website API] Bot sending command to Flask: {full_url} with payload: {payload}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(full_url, json=payload) as response:
                response.raise_for_status()
                data = await response.json()
                logger.info(f"[Website API] Bot received response ({response.status}) from {full_url}: {data}")
                
                # --- NEW: Bot Feedback for Server-side Errors ---
                if data.get("status") == "error":
                    # If Flask reports an error (e.g., user offline), feedback to Discord directly
                    await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ Server Error for `{user_id}`: {data.get('message', 'Unknown server error.')}")
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"[Website API] Bot-to-Flask API error {e.status} for {full_url}. Response: {e.message}", exc_info=True, extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ Error communicating with website for `{user_id}`: HTTP {e.status} - {e.message}")
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"[Website API] Bot failed to connect to local Flask API at {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ Critical Error: Bot could not connect to its own website backend. Server might be down or misconfigured.")
        return {"status": "error", "message": f"Could not connect to internal Flask API."}
    except Exception as e:
        logger.error(f"[Website API] Bot-side unexpected error interacting with Flask API {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ An unexpected bot error occurred while executing command for `{user_id}`: {e}")
        return {"status": "error", "message": f"An unexpected error occurred in bot-to-website interaction."}


async def website_get_data(endpoint: str, user_id: str = None, **kwargs):
    api_base = f"http://localhost:{WEB_SERVER_PORT}"
    query_params = f"?user_id={user_id}" if user_id else ""
    full_url = f"{api_base}{endpoint}{query_params}"
    logger.info(f"[Website API] Bot fetching data from Flask: {full_url}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(full_url) as response:
                response.raise_for_status()
                data = await response.json()
                logger.info(f"[Website API] Bot received response ({response.status}) from {full_url}: {data}")

                if data.get("status") == "error":
                    await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ Server Error getting data for `{user_id}`: {data.get('message', 'Unknown server error.')}")
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"[Website API] Bot-to-Flask API error {e.status} for {full_url}. Response: {e.message}", exc_info=True, extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ Error retrieving data from website for `{user_id}`: HTTP {e.status} - {e.message}")
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"[Website API] Bot failed to connect to local Flask API for data {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ Critical Error: Bot could not connect to its own website backend for data. Server might be down or misconfigured.")
        return {"status": "error", "message": f"Could not connect to internal Flask API."}
    except Exception as e:
        logger.error(f"[Website API] Bot-side unexpected error fetching from Flask API {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        await bot.get_channel(kwargs.get('ctx_channel_id')).send(f"❌ An unexpected bot error occurred while fetching data for `{user_id}`: {e}")
        return {"status": "error", "message": f"An unexpected error occurred in bot-to-website data fetch."}


# --- Bot's internal functions for User Connection/Disconnection Announcements (to Discord) ---
async def bot_user_connected_announcement(user_id: str, username: str = "Unknown User"):
    """Sends a user connected message to Discord's LOGIN_CHANNEL_ID."""
    if LOGIN_CHANNEL_ID == 0: logger.warning(f"LOGIN_CHANNEL_ID is 0. Cannot send user connected announcement for {username}."); return
    channel = bot.get_channel(LOGIN_CHANNEL_ID)
    if channel: await channel.send(f"🟢 **{username}** (ID: `{user_id}`) Has Been Connected.. Awaiting Commands."); logger.info(f"Announced user '{username}' (ID: {user_id}) connected to Discord channel: {channel.name} ({LOGIN_CHANNEL_ID})")
    else: logger.warning(f"Configured LOGIN_CHANNEL_ID ({LOGIN_CHANNEL_ID}) not found or bot lacks permissions. Cannot announce user '{username}' connected.")

async def bot_user_disconnected_announcement(user_id: str, username: str = "Unknown User"):
    """Sends a user disconnected message to Discord's DISCONNECTED_CHANNEL_ID."""
    if DISCONNECTED_CHANNEL_ID == 0: logger.warning(f"DISCONNECTED_CHANNEL_ID is 0. Cannot send user disconnected announcement for {username}."); return
    channel = bot.get_channel(DISCONNECTED_CHANNEL_ID)
    if channel: await channel.send(f"🔴 **{username}** (ID: `{user_id}`) Has Been Disconnected.."); logger.info(f"Announced user '{username}' (ID: {user_id}) disconnected to Discord channel: {channel.name} ({DISCONNECTED_CHANNEL_ID})")
    else: logger.critical(f"Configured DISCONNECTED_CHANNEL_ID ({DISCONNECTED_CHANNEL_ID}) not found or bot lacks permissions. Cannot announce user '{username}' disconnected.")


# --- Bot Event Handlers ---
@bot.event
async def on_ready():
    logger.info(f'Logged in as {bot.user.name} ({bot.user.id})')
    logger.info('Bot is ready!')

    if LOGGING_CHANNEL_ID != 0: discord_log_handler = DiscordHandler(bot, LOGGING_CHANNEL_ID, level=logging.INFO); logger.addHandler(discord_log_handler); logger.info(f"Attached DiscordHandler for general logs to channel ID {LOGGING_CHANNEL_ID}")
    else: logger.warning("LOGGING_CHANNEL_ID not set or is 0. General bot activity will not be logged to Discord.")
    if ERROR_CHANNEL_ID != 0: discord_error_handler = DiscordHandler(bot, ERROR_CHANNEL_ID, level=logging.ERROR); logger.addHandler(discord_error_handler); logger.info(f"Attached DiscordHandler for error logs to channel ID {ERROR_CHANNEL_ID}")
    else: logger.critical("ERROR_CHANNEL_ID not set or is 0. Critical errors will NOT be logged to a Discord channel.")

    if WEBSITE_CHANNEL_ID != 0: channel = bot.get_channel(WEBSITE_CHANNEL_ID); if channel: await channel.send("System Is Now Online. Waiting for commands.."); logger.info(f"Sent 'System Online' message to Discord channel: {channel.name} (ID: {WEBSITE_CHANNEL_ID})")
    else: logger.warning("WEBSITE_CHANNEL_ID not set or is 0. System online status will not be announced to Discord.")


@bot.event
async def on_disconnect():
    logger.critical("Bot has disconnected from Discord!")
    if DISCONNECTED_CHANNEL_ID != 0:
        disconnect_channel = bot.get_channel(DISCONNECTED_CHANNEL_ID)
        if disconnect_channel: embed = discord.Embed(title="🔴 Bot Disconnected!", description=f"The bot **{bot.user.name}** has lost connection to Discord. Check logs for details.", color=discord.Color.red(), timestamp=discord.utils.utcnow()); embed.set_footer(text="Attempting to reconnect..." if bot.is_ws_ratelimited() else "Might be manual restart or fatal error."); try: await disconnect_channel.send(embed=embed); logger.warning(f"Sent 'Bot Disconnected' message to channel {disconnect_channel.name} ({DISCONNECTED_CHANNEL_ID}).")
        except (discord.Forbidden, discord.HTTPException) as e: logger.error(f"Failed to send 'Bot Disconnected' message to channel {DISCONNECTED_CHANNEL_ID} (permissions/HTTP error): {e}")
        else: logger.critical(f"Bot disconnected, but configured DISCONNECTED_CHANNEL_ID ({DISCONNECTED_CHANNEL_ID}) for bot's own status is invalid or not found. Cannot send notification.")
    else: logger.critical("Bot disconnected, but DISCONNECTED_CHANNEL_ID (for bot's own status) is not set or is 0. Cannot send notification.")

@bot.event
async def on_message(message):
    if message.author == bot.user: return
    await bot.process_commands(message)

@bot.event
async def on_command(ctx):
    guild_name = ctx.guild.name if ctx.guild else "DM"; channel_name = ctx.channel.name if ctx.channel else "DM"; command_args = ctx.args[2:] if len(ctx.args) > 2 else []
    log_message = (f"Command '{ctx.command.name}' invoked by {ctx.author} (ID: {ctx.author.id}) in #{channel_name} (Guild: {guild_name}, ID: {ctx.guild.id if ctx.guild else '0'}) Args: {command_args}")
    logger.info(log_message, extra={'guild_name': guild_name, 'channel_name': channel_name, 'command_name': ctx.command.name, 'user_name': str(ctx.author), 'user_id': ctx.author.id, 'full_command': ctx.message.content})

@bot.event
async def on_command_error(ctx, error):
    error_context = {'guild_name': ctx.guild.name if ctx.guild else "DM", 'channel_name': ctx.channel.name if ctx.channel else "DM", 'command_name': ctx.command.name if hasattr(ctx, 'command') and ctx.command else "N/A", 'user_name': str(ctx.author), 'user_id': ctx.author.id, 'full_command': ctx.message.content }
    if isinstance(error, commands.CommandNotFound): logger.warning(f"Command '{ctx.message.content}' not found. Invoked by {ctx.author} (ID: {ctx.author.id}).", extra=error_context); return
    elif isinstance(error, commands.MissingRequiredArgument): await ctx.send(f"Error: Missing required argument(s) for command `{error_context['command_name']}`. Please check `{COMMAND_PREFIX}help {error_context['command_name']}` for usage. Details: `{error}`"); logger.warning(f"Missing arguments for command '{error_context['command_name']}' by {ctx.author}: {error}", extra=error_context)
    elif isinstance(error, commands.BadArgument): await ctx.send(f"Error: Invalid argument(s) for command `{error_context['command_name']}`. Please check `{COMMAND_PREFIX}help {error_context['command_name']}`. Details: `{error}`"); logger.warning(f"Bad arguments for command '{error_context['command_name']}' by {ctx.author}: {error}", extra=error_context)
    elif isinstance(error, commands.MissingPermissions) or isinstance(error, commands.NotOwner) or isinstance(error, commands.CheckFailure): await ctx.send("You do not have the necessary permissions to use this command."); logger.warning(f"Permission denied for command '{error_context['command_name']}' by {ctx.author}: {error}", extra=error_context)
    else: await ctx.send(f"An unexpected error occurred while executing command `{error_context['command_name']}`. An administrator has been notified. Details have been logged."); logger.error(f"Unhandled error in command '{error_context['command_name']}' invoked by {ctx.author}: {error}", exc_info=True, extra=error_context)


# --- Helper for Admin Role Check (As before) ---
def is_admin():
    async def predicate(ctx): # ... as before ...
        if not ADMIN_ROLE_ID: logger.debug("ADMIN_ROLE_ID not set in config, bypassing admin check.", extra={'user_name': str(ctx.author), 'user_id': ctx.author.id}); return True
        if not ctx.guild: raise commands.CheckFailure("This command can only be used in a server.")
        admin_role = discord.utils.get(ctx.guild.roles, id=ADMIN_ROLE_ID)
        if admin_role and admin_role in ctx.author.roles: logger.debug(f"Admin check passed for {ctx.author}.", extra={'user_name': str(ctx.author), 'user_id': ctx.author.id, 'guild_name': ctx.guild.name}); return True
        else:
            if admin_role: logger.warning(f"Admin check failed for {ctx.author}: Missing role '{admin_role.name}'.", extra={'guild_name': ctx.guild.name, 'guild_id': ctx.guild.id, 'user_name': str(ctx.author), 'user_id': ctx.author.id}); raise commands.CheckFailure(f"You need the role '{admin_role.name}' to use this command.")
            else: logger.error(f"Configured ADMIN_ROLE_ID ({ADMIN_ROLE_ID}) not found in guild {ctx.guild.id}. Admin check failed for {ctx.author}.", extra={'guild_name': ctx.guild.name, 'guild_id': ctx.guild.id, 'user_name': str(ctx.author), 'user_id': ctx.author.id}); raise commands.CheckFailure(f"Admin role configured (ID: {ADMIN_ROLE_ID}) does not exist in this server. Please check config.")
    return commands.check(predicate)

# --- Discord Bot Commands ---
@bot.command(name='help')
async def help_command(ctx): # ... as before ...
    """Displays this help dialog."""
    help_message = f"""
**__Discord Control Commands (Prefix: `{COMMAND_PREFIX}`)__**
`.(user_identifier) : User Identifier is your website's user ID.`
**General Commands:**
- `{COMMAND_PREFIX}help`: Shows this help dialog.
- `{COMMAND_PREFIX}Online`: Shows all online users logged in.

**User Specific Commands (requires a user ID):**
- `{COMMAND_PREFIX}Information (user)`: Shows detailed information about the user.
- `{COMMAND_PREFIX}Logout (user)`: Logs out the user from the site.
- `{COMMAND_PREFIX}Panic (user), (redirect_url)`: Panics the user to a site or custom URL. Default is `about:blank`.
- `{COMMAND_PREFIX}ZoomControl (user), (level)`: Controls the website zoom for the user (e.g., `100`, `125`, `75`).
- `{COMMAND_PREFIX}ClearUpdates (user)`: Clears the user's update logs on the site.
- `{COMMAND_PREFIX}ClearNotifications (user)`: Clears the user's notifications.
- `{COMMAND_PREFIX}ClearActivity (user)`: Clears the user's activity logs.
- `{COMMAND_PREFIX}ClearError (user)`: Clears error logs for the user.
- `{COMMAND_PREFIX}ClearLoginHistory (user)`: Clears the user's login logs.
- `{COMMAND_PREFIX}ClearAll (user)`: Clears ALL logs/data for the user (USE WITH CAUTION).
- `{COMMAND_PREFIX}SetClicks (user), (number)`: Sets the user's click count.
- `{COMMAND_PREFIX}ClearClicks (user)`: Clears all click counts for the user.
- `{COMMAND_PREFIX}Stats (user)`: Shows all stats for the user.
- `{COMMAND_PREFIX}SessionTime (user)`: Shows the current session time for the user.
- `{COMMAND_PREFIX}SetAnnouncement (user), (message)`: Sets a custom announcement for the user.
- `{COMMAND_PREFIX}Restart (user)`: Restarts their page/session.
- `{COMMAND_PREFIX}Theme (user), (theme_name)`: Changes the user's theme (e.g., `dark`, `light`).
- `{COMMAND_PREFIX}Screenshot (user)`: Shows an image of their screen. *(Admin Only)*
- `{COMMAND_PREFIX}Notes (user)`: Shows the user's notes.
- `{COMMAND_PREFIX}SetColor (user), (hex_code)`: Sets the user's dashboard color (e.g., `#1abc9c`).
- `{COMMAND_PREFIX}Event (user), (event_name), (message)`: Sets a custom event for the user.
- `{COMMAND_PREFIX}Sections (user), (action), (section_name)`: Removes or enables website sections (e.g., `enable banner`, `remove sidebar`).
- `{COMMAND_PREFIX}Device (user)`: Shows the user's device information.

*This list includes the 25+ commands you requested.*
"""
    await ctx.send(help_message)

@bot.command(name='Information', aliases=['info'])
async def user_information(ctx, user_id: str): 
    await ctx.send(f"Fetching information for user `{user_id}`...")
    # Pass ctx.channel.id to website_get_data for direct error feedback to user
    response_data = await website_get_data(f"/api/users/{user_id}/info", user_id=user_id, ctx_channel_id=ctx.channel.id) 
    if response_data and response_data.get("status") == "success":
        user_data = response_data.get("data", {})
        if user_data:
            embed = discord.Embed(title=f"User Information: {user_data.get('username', user_id)}", color=0x3498db)
            embed.add_field(name="User ID", value=user_data.get('userID', 'N/A'), inline=True) # Use userID
            embed.add_field(name="Name", value=user_data.get('name', 'N/A'), inline=True)
            embed.add_field(name="Email", value=user_data.get('email', 'N/A'), inline=True)
            embed.add_field(name="Online Status", value="✅ Online" if user_data.get('is_online', False) else "❌ Offline", inline=True)
            embed.add_field(name="Last Login", value=user_data.get('accountCreationDate', 'N/A'), inline=False) # Changed from last_login
            await ctx.send(embed=embed)
        else: await ctx.send(f"No detailed data found for user `{user_id}`.") 
    # Error feedback is handled by website_get_data if status is error.

@bot.command(name='Online')
async def online_users(ctx): 
    await ctx.send("Fetching online users...")
    response_data = await website_get_data("/api/online_users", ctx_channel_id=ctx.channel.id)
    if response_data and response_data.get("status") == "success":
        users = response_data.get("data", [])
        if users:
            online_list = "\n".join([f"- `{u.get('username', 'N/A')}` (ID: `{u.get('user_id', 'N/A')}`) [Sessions: {u.get('sessions', 1)}]" for u in users])
            embed = discord.Embed(title="🌐 Currently Online Users", description=online_list, color=0x2ecc71)
            embed.set_footer(text=f"Total: {len(users)} users online.")
            await ctx.send(embed=embed)
        else: await ctx.send("No users are currently online.")
    # Error feedback is handled by website_get_data if status is error.

@bot.command(name='Logout')
async def logout_user(ctx, user_id: str):
    await ctx.send(f"Attempting to log out user `{user_id}`...")
    response = await website_send_command("/api/user/logout", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success':
        await ctx.send(f"Logout command sent to user `{user_id}`. User's browser will now be logged out.")
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='Panic')
async def panic_user(ctx, user_id: str, redirect_url: str = "about:blank"):
    await ctx.send(f"Sending panic command for user `{user_id}` to redirect to `{redirect_url}`...")
    response = await website_send_command("/api/user/panic", user_id=user_id, url=redirect_url, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success':
        await ctx.send(f"Panic command sent to user `{user_id}`. Browser will redirect to {redirect_url}.")
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ZoomControl')
async def zoom_control(ctx, user_id: str, level: int): 
    if not 50 <= level <= 200: await ctx.send("Zoom level must be between 50 and 200 (as an integer percentage)."); return
    await ctx.send(f"Setting zoom level for user `{user_id}` to `{level}%`...")
    response = await website_send_command("/api/user/zoom", user_id=user_id, level=level, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success':
        await ctx.send(f"Zoom command sent to user `{user_id}`. Browser zoom set to {level}%.")
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ClearUpdates')
async def clear_updates(ctx, user_id: str): 
    await ctx.send(f"Clearing update logs for user `{user_id}`...")
    response = await website_send_command("/api/user/clear_updates", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear updates command sent to user `{user_id}`.");
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ClearNotifications')
async def clear_notifications(ctx, user_id: str): 
    await ctx.send(f"Clearing notifications for user `{user_id}`...")
    response = await website_send_command("/api/user/clear_notifications", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear notifications command sent to user `{user_id}`.");
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ClearActivity')
async def clear_activity(ctx, user_id: str): 
    await ctx.send(f"Clearing activity logs for user `{user_id}`...")
    response = await website_send_command("/api/user/clear_activity", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear activity command sent to user `{user_id}`.");
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ClearError')
async def clear_error(ctx, user_id: str): 
    await ctx.send(f"Clearing error logs for user `{user_id}`...")
    response = await website_send_command("/api/user/clear_errors", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear error command sent to user `{user_id}`.");
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ClearLoginHistory')
async def clear_login_history(ctx, user_id: str): 
    await ctx.send(f"Clearing login history for user `{user_id}`...")
    response = await website_send_command("/api/user/clear_login_history", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear login history command sent to user `{user_id}`.");
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='ClearAll')
@is_admin()
async def clear_all(ctx, user_id: str): 
    await ctx.send(f"**WARNING:** Executing `ClearAll` for user `{user_id}`... This is irreversible. Confirm if you wish to proceed.")
    response = await website_send_command("/api/user/clear_all_data", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear all data command sent to user `{user_id}`.");
    # Error feedback is handled by website_send_command if status is error.

@bot.command(name='SetClicks')
async def set_clicks(ctx, user_id: str, count: int): 
    await ctx.send(f"Setting clicks for user `{user_id}` to `{count}`...")
    response = await website_send_command("/api/user/set_clicks", user_id=user_id, count=count, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Set clicks command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to set clicks for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='ClearClicks')
async def clear_clicks(ctx, user_id: str): 
    await ctx.send(f"Clearing clicks for user `{user_id}`...")
    response = await website_send_command("/api/user/clear_clicks", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Clear clicks command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to clear clicks for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Stats')
async def get_stats(ctx, user_id: str): 
    await ctx.send(f"Fetching stats for user `{user_id}`...")
    response_data = await website_get_data(f"/api/users/{user_id}/stats", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response_data and response_data.get("status") == "success":
        user_stats = response_data.get("data", {})
        embed = discord.Embed(title=f"Statistics for {user_stats.get('username', user_id)}", color=0x9b59b6)
        embed.add_field(name="Total Clicks", value=user_stats.get('total_clicks', 'N/A'), inline=True)
        embed.add_field(name="Session Count", value=user_stats.get('session_count', 'N/A'), inline=True)
        embed.add_field(name="Avg. Session Time", value=user_stats.get('avg_session_time', 'N/A'), inline=True)
        embed.add_field(name="Errors Logged", value=user_stats.get('error_count', 'N/A'), inline=True)
        embed.add_field(name="Last Activity", value=user_stats.get('last_activity', 'N/A'), inline=False)
        await ctx.send(embed=embed)
    else: await ctx.send(f"Failed to fetch stats for `{user_id}`. Server said: {response_data.get('message', 'N/A')}")

@bot.command(name='SessionTime')
async def get_session_time(ctx, user_id: str): 
    await ctx.send(f"Fetching session time for user `{user_id}`...")
    response_data = await website_get_data(f"/api/users/{user_id}/session_time", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response_data and response_data.get("status") == "success":
        session_time = response_data.get("data", {}).get("current_session_time", "N/A")
        await ctx.send(f"Current session time for `{user_id}`: `{session_time}`.")
    else: await ctx.send(f"Failed to fetch session time for `{user_id}`. Server said: {response_data.get('message', 'N/A')}")

@bot.command(name='SetAnnouncement')
async def set_announcement(ctx, user_id: str, *, message: str): 
    await ctx.send(f"Setting announcement for user `{user_id}`: `{message}`...")
    response = await website_send_command("/api/user/set_announcement", user_id=user_id, message=message, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Set announcement command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to set announcement for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Restart')
async def restart_user_page(ctx, user_id: str): 
    await ctx.send(f"Restarting page for user `{user_id}`...")
    response = await website_send_command("/api/user/restart_page", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Restart page command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to restart page for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Theme')
async def change_theme(ctx, user_id: str, theme_name: str): 
    await ctx.send(f"Changing theme for user `{user_id}` to `{theme_name}`...")
    response = await website_send_command("/api/user/set_theme", user_id=user_id, theme_name=theme_name, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Set theme command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to set theme for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Screenshot')
@is_admin()
async def screenshot_user(ctx, user_id: str): 
    await ctx.send(f"Requesting screenshot for user `{user_id}`... This may take a moment.")
    response = await website_send_command("/api/user/screenshot", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Screenshot request sent to user `{user_id}`. Image will be sent to this channel if client uploads it.");
    else: await ctx.send(f"Failed to request screenshot for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Notes')
async def get_user_notes(ctx, user_id: str): 
    await ctx.send(f"Fetching notes for user `{user_id}`...")
    response_data = await website_get_data(f"/api/users/{user_id}/notes", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response_data and response_data.get("status") == "success":
        notes = response_data.get("data", {}).get("notes", "No notes found.")
        await ctx.send(f"Notes for `{user_id}`:\n>>> {notes}")
    else: await ctx.send(f"Failed to fetch notes for `{user_id}`. Server said: {response_data.get('message', 'N/A')}")

@bot.command(name='SetColor')
async def set_dashboard_color(ctx, user_id: str, hex_code: str): 
    if not (hex_code.startswith('#') and len(hex_code) == 7 and all(c in '0123456789abcdefABCDEF' for c in hex_code[1:])):
        await ctx.send("Please provide a valid hex color code (e.g., `#1abc9c`)."); return
    await ctx.send(f"Setting dashboard color for user `{user_id}` to `{hex_code}`...")
    response = await website_send_command("/api/user/set_dashboard_color", user_id=user_id, color=hex_code, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Set dashboard color command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to set dashboard color for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Event')
async def set_custom_event(ctx, user_id: str, event_name: str, *, message: str = "N/A"): 
    await ctx.send(f"Setting custom event `{event_name}` for user `{user_id}` with message: `{message}`...")
    response = await website_send_command("/api/user/set_event", user_id=user_id, event_name=event_name, message=message, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Set custom event command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to set custom event for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Sections')
async def control_sections(ctx, user_id: str, action: str, *, section_name: str): 
    if action.lower() not in ["remove", "enable"]: await ctx.send("Invalid action. Please use `remove` or `enable`."); return
    await ctx.send(f"Attempting to `{action}` section `{section_name}` for user `{user_id}`...")
    response = await website_send_command("/api/user/control_section", user_id=user_id, action=action, section=section_name, ctx_channel_id=ctx.channel.id)
    if response.get('status') == 'success': await ctx.send(f"Control section command sent to user `{user_id}`.");
    else: await ctx.send(f"Failed to control section for `{user_id}`. Server said: {response.get('message', 'N/A')}")

@bot.command(name='Device')
async def get_device_info(ctx, user_id: str): 
    await ctx.send(f"Fetching device information for user `{user_id}`...")
    response_data = await website_get_data(f"/api/users/{user_id}/device_info", user_id=user_id, ctx_channel_id=ctx.channel.id)
    if response_data and response_data.get("status") == "success":
        device_info = response_data.get("data", {})
        embed = discord.Embed(title=f"Device Info for {user_id}", color=0xf1c40f)
        embed.add_field(name="User Agent", value=device_info.get('user_agent', 'N/A'), inline=False)
        embed.add_field(name="IP Address", value=device_info.get('ip_address', 'N/A'), inline=True)
        embed.add_field(name="Browser", value=device_info.get('browser', 'N/A'), inline=True)
        embed.add_field(name="Operating System", value=device_info.get('os', 'N/A'), inline=True)
        embed.add_field(name="Screen Resolution", value=device_info.get('screen_resolution', 'N/A'), inline=True)
        await ctx.send(embed=embed)
    else: await ctx.send(f"Failed to fetch device info for `{user_id}`. Server said: {response_data.get('message', 'N/A')}")


# --- Startup and Shutdown ---
def start_discord_bot_in_thread(discord_bot_instance, token):
    """Runs the Discord bot in its own event loop within a new thread."""
    try:
        bot_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(bot_loop)
        
        bot_loop.run_until_complete(discord_bot_instance.start(token)) 
    except discord.errors.LoginFailure as e:
        logger.critical(f"Discord Bot Login Failed in thread: Invalid Token. {e}", exc_info=True)
        bot_loop.call_soon_threadsafe(
            lambda: asyncio.create_task(_send_critical_notification_during_thread_failure("Discord Bot Thread Critical Error: Login Failure", str(e))))
        os._exit(1)
    except Exception as e:
        logger.critical(f"Discord bot thread crashed unexpectedly: {e}", exc_info=True)
        bot_loop.call_soon_threadsafe(
            lambda: asyncio.create_task(_send_critical_notification_during_thread_failure("Discord Bot Thread Critical Error: Unhandled Exception", str(e))))
        os._exit(1)

async def _send_critical_notification_during_thread_failure(title, details):
    """Internal helper to attempt sending a critical Discord message during thread failure."""
    if ERROR_CHANNEL_ID != 0:
        error_channel = bot.get_channel(ERROR_CHANNEL_ID)
        if error_channel: 
            embed = discord.Embed(title=title, description=f"```fix\n{details}\n```\nBot task in thread likely terminated.", color=discord.Color.dark_red(), timestamp=discord.utils.utcnow())
            try: await error_channel.send(embed=embed)
            except Exception: pass


if __name__ == '__main__':
    if not DISCORD_TOKEN:
        logger.critical("DISCORD_TOKEN not found in environment variables. Bot cannot start. Exiting.")
        exit(1)

    # --- Start the Discord Bot in a Separate Thread ---
    logger.info("Starting Discord bot in a separate thread...")
    discord_bot_thread = Thread(target=start_discord_bot_in_thread, args=(bot, DISCORD_TOKEN), daemon=True) 
    discord_bot_thread.start()

    # --- Start the Flask-SocketIO Web App in the Main Thread ---
    try:
        logger.info(f"Starting Flask-SocketIO web app in MAIN thread on 0.0.0.0:{WEB_SERVER_PORT} for Render Web Service...")
        socketio.run(web_app, host='0.0.0.0', port=WEB_SERVER_PORT, debug=False, allow_unsafe_werkzeug=True, log_output=True)
    except Exception as e:
        logger.critical(f"An unhandled critical error occurred in the Flask-SocketIO web app (main thread) startup: {e}. Exiting.", exc_info=True)
        exit(1)
