import discord
from discord.ext import commands
import os
import asyncio
import logging
import aiohttp
import json
import collections
from threading import Thread, Lock
import traceback # For debugging, just in case

# --- Flask and Socket.IO imports ---
from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room, Namespace
import eventlet # Required for Flask-SocketIO when integrating with asyncio loops


# --- Configuration Imports ---
from config import (
    DISCORD_TOKEN, COMMAND_PREFIX, WEBSITE_API_BASE_URL, ADMIN_ROLE_ID,
    WEBSITE_CHANNEL_ID, LOGIN_CHANNEL_ID, DISCONNECTED_CHANNEL_ID,
    LOGGING_CHANNEL_ID, ERROR_CHANNEL_ID
)

# --- Integrated Whitelist Data (for server-side authentication) ---
WHITELIST_DATA = [
  {
    "name": "Testing Purposes", "username": "TEST", "password": "Testing.2579",
    "rank": 9999, "role": "Unauthorized User", "userID": "9999",
    "accountCreationDate": "2025-08-19T11:25:00Z", "status": "active"
  },
  {
    "name": "Beta Tester", "username": "Tester", "password": "DEMO_PASSWORD_Tester",
    "rank": 1, "role": "Partial Access User", "userID": "1",
    "accountCreationDate": "2024-08-19T11:25:00Z", "status": "active"
  },
  {
    "name": "Curtis", "username": "Zapperix", "password": "DEMO_PASSWORD_Zapperix", # <<< Corrected 'username' key in original
    "rank": 12, "role": "Normal User", "userID": "3923",
    "accountCreationDate": "2024-08-18T20:01:00Z", "status": "active"
  },
  {
    "name": "Not Set Up Yet", "username": "Zillionix", "password": "DEMO_PASSWORD_Zillionix",
    "rank": 20, "role": "Normal User", "userID": "1083",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zynthex", "password": "DEMO_PASSWORD_Zynthex",
    "rank": 8, "role": "Normal User", "userID": "8471",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zabbleon", "password": "DEMO_PASSWORD_Zabbleon",
    "rank": 15, "role": "Normal User", "userID": "6902",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zenkora", "password": "DEMO_PASSWORD_Zenkora",
    "rank": 10, "role": "Normal User", "userID": "7582",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zorvane", "password": "DEMO_PASSWORD_Zorvane",
    "rank": 18, "role": "Normal User", "userID": "2193",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Ziphros", "password": "DEMO_PASSWORD_Ziphros",
    "rank": 7, "role": "Normal User", "userID": "9901",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zorkael", "password": "DEMO_PASSWORD_Zorkael",
    "rank": 25, "role": "Normal User", "userID": "3258",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zyncope", "password": "DEMO_PASSWORD_Zyncope",
    "rank": 5, "role": "Normal User", "userID": "4291",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Zermion", "password": "DEMO_PASSWORD_Zermion",
    "rank": 11, "role": "Normal User", "userID": "5803",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xylander", "password": "DEMO_PASSWORD_Xylander",
    "rank": 9, "role": "Normal User", "userID": "6592",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xavorian", "password": "DEMO_PASSWORD_Xavorian",
    "rank": 14, "role": "Normal User", "userID": "1495",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xandrex", "password": "DEMO_PASSWORD_Xandrex",
    "rank": 13, "role": "Normal User", "userID": "8620",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xenplix", "password": "DEMO_PASSWORD_Xenplix",
    "rank": 6, "role": "Normal User", "userID": "4920",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xyndora", "password": "DEMO_PASSWORD_Xyndora",
    "rank": 22, "role": "Normal User", "userID": "6328",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xennova", "password": "DEMO_PASSWORD_Xennova",
    "rank": 17, "role": "Normal User", "userID": "1776",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xebiron", "password": "DEMO_PASSWORD_Xebiron",
    "rank": 4, "role": "Normal User", "userID": "7940",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xortian", "password": "DEMO_PASSWORD_Xortian",
    "rank": 21, "role": "Normal User", "userID": "2983",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xurphon", "password": "DEMO_PASSWORD_Xurphon",
    "rank": 16, "role": "Normal User", "userID": "9123",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Xelquon", "password": "DEMO_PASSWORD_Xelquon",
    "rank": 19, "role": "Normal User", "userID": "2334",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yanthor", "password": "DEMO_PASSWORD_Yanthor",
    "rank": 8, "role": "Normal User", "userID": "7173",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yeltrax", "password": "DEMO_PASSWORD_Yeltrax",
    "rank": 24, "role": "Normal User", "userID": "8372",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yomplex", "password": "DEMO_PASSWORD_Yomplex",
    "rank": 3, "role": "Normal User", "userID": "1648",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yerpion", "password": "DEMO_PASSWORD_Yerpion",
    "rank": 20, "role": "Normal User", "userID": "3417",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yeznith", "password": "DEMO_PASSWORD_Yeznith",
    "rank": 10, "role": "Normal User", "userID": "9821",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yxorian", "password": "DEMO_PASSWORD_Yxorian",
    "rank": 12, "role": "Normal User", "userID": "7542",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yimzorn", "password": "DEMO_PASSWORD_Yimzorn",
    "rank": 7, "role": "Normal User", "userID": "3842",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yumbrix", "password": "DEMO_PASSWORD_Yumbrix",
    "rank": 15, "role": "Normal User", "userID": "2167",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yarlion", "password": "DEMO_PASSWORD_Yarlion",
    "rank": 18, "role": "Normal User", "userID": "6230",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yaxtren", "password": "DEMO_PASSWORD_Yaxtren",
    "rank": 9, "role": "Normal User", "userID": "1533",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Yevoron", "password": "DEMO_PASSWORD_Yevoron",
    "rank": 21, "role": "Normal User", "userID": "5864",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Oblinex", "password": "DEMO_PASSWORD_Oblinex",
    "rank": 13, "role": "Normal User", "userID": "8894",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Obrixel", "password": "DEMO_PASSWORD_Obrixel",
    "rank": 6, "role": "Normal User", "userID": "7254",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Orvenix", "password": "DEMO_PASSWORD_Orvenix",
    "rank": 14, "role": "Normal User", "userID": "1416",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Oxlurion", "password": "DEMO_PASSWORD_Oxlurion",
    "rank": 8, "role": "Normal User", "userID": "6009",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Oxandor", "password": "DEMO_PASSWORD_Oxandor",
    "rank": 11, "role": "Normal User", "userID": "9874",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Ontriex", "password": "DEMO_PASSWORD_Ontriex",
    "rank": 16, "role": "Normal User", "userID": "4012",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Ozintor", "password": "DEMO_PASSWORD_Ozintor",
    "rank": 7, "role": "Normal User", "userID": "1933",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Ozmanix", "password": "DEMO_PASSWORD_Ozmanix",
    "rank": 19, "role": "Normal User", "userID": "5055",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Oxyplex", "password": "DEMO_PASSWORD_Oxyplex",
    "rank": 5, "role": "Normal User", "userID": "3372",
    "accountCreationDate": None, "status": "pending"
  },
  {
    "name": "Not Set Up Yet", "username": "Orthonel", "password": "DEMO_PASSWORD_Orthonel",
    "rank": 20, "role": "Normal User", "userID": "8632",
    "accountCreationDate": None, "status": "pending"
  }
]
# Server-side Reset Code
RESET_CODE_SERVER_SECRET = "Reset.2579"

# --- Setup Logging ---
logger = logging.getLogger('discord_bot')
logger.setLevel(logging.INFO) # Global log level

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
eventlet.monkey_patch() # Patch standard library to be non-blocking for Flask-SocketIO.
from flask import Flask, request, jsonify, send_from_directory
web_app = Flask(__name__, static_folder='static', static_url_path='/')

WEB_SERVER_PORT = int(os.getenv("PORT", 8000))
socketio = SocketIO(web_app, async_mode='eventlet', cors_allowed_origins="*")

# --- Global server-side state for Socket.IO (thread-safe management) ---
# Maps a user's ID to a list of active Socket.IO SIDs (sessions). A user can have multiple browser tabs/devices.
online_users_ws = collections.defaultdict(list) # {userID: [sid1, sid2, ...]}
sid_to_user_map = {} # {sid: userID} - for quick reverse lookup

# Login attempt counter for Flask backend
login_attempts_server = 3 # This will reset each time the service restarts.
attempts_lock = Lock() # To make login_attempts_server thread-safe if Flask scales to multiple workers.

# --- Helper for Server-Side Discord Webhooks ---
# This dictionary contains all your webhook URLs (defined as environment variables on Render)
# IMPORTANT: YOU MUST SET THESE IN RENDER'S ENVIRONMENT VARIABLES (or update to be configurable)
WEBHOOK_URLS = {
    "usernameInformation": os.getenv("WEBHOOK_USERNAME_INFO"),
    "passwordInformation": os.getenv("WEBHOOK_PASSWORD_INFO"),
    "identifierInformation": os.getenv("WEBHOOK_IDENTIFIER_INFO"),
    "invalidUsernameInformation": os.getenv("WEBHOOK_INVALID_USERNAME_INFO"),
    "invalidPasswordInformation": os.getenv("WEBHOOK_INVALID_PASSWORD_INFO"),
    "invalidIdentifierInformation": os.getenv("WEBHOOK_INVALID_IDENTIFIER_INFO"),
    "attemptCounterInformation": os.getenv("WEBHOOK_ATTEMPT_COUNTER_INFO"),
    "attemptExceededInformation": os.getenv("WEBHOOK_ATTEMPT_EXCEEDED_INFO"),
    "resetInformation": os.getenv("WEBHOOK_RESET_INFO"),
    "correctInformation": os.getenv("WEBHOOK_CORRECT_INFO"),
    "incorrectInformation": os.getenv("WEBHOOK_INCORRECT_INFO"),
    "userInformation": os.getenv("WEBHOOK_USER_INFO"),
    "browserInformation": os.getenv("WEBHOOK_BROWSER_INFO"),
    "deviceInformation": os.getenv("WEBHOOK_DEVICE_INFO"),
    "connectionInformation": os.getenv("WEBHOOK_CONNECTION_INFO"),
    "sessionInformation": os.getenv("WEBHOOK_SESSION_INFO"),
}

EMBED_FIELD_LIMIT = 25 # Discord API limit

def create_embeds_from_fields(title, color, fields, description = None):
    embeds = []
    for i in range(0, len(fields), EMBED_FIELD_LIMIT):
        chunk = fields[i : i + EMBED_FIELD_LIMIT]
        embeds.append({
            "title": title if i == 0 else f"{title} (Cont.)",
            "description": description if i == 0 else None,
            "color": color,
            "fields": chunk
        })
    if not embeds: # Always ensure at least one embed
        embeds.append({"title": title, "description": description or "No details.", "color": color})
    return embeds

async def send_server_webhook(url_key, title, color, fields, description=None, username="Server Logger"):
    webhook_url = WEBHOOK_URLS.get(url_key)
    if not webhook_url:
        logger.error(f"Webhook URL for key '{url_key}' is not configured.")
        return False

    embeds_list = create_embeds_from_fields(title, color, fields, description)
    current_time = discord.utils.utcnow().isoformat()

    final_payload_embeds = []
    for embed in embeds_list:
        final_payload_embeds.append({
            **embed,
            "timestamp": current_time,
            "footer": {"text": username}
        })

    try:
        async with aiohttp.ClientSession() as session:
            response = await session.post(webhook_url, json={"embeds": final_payload_embeds})
            response.raise_for_status()
            logger.info(f"Webhook sent successfully to {url_key}.")
            return True
    except aiohttp.ClientError as e:
        logger.error(f"Failed to send webhook to {url_key}: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error sending webhook to {url_key}: {e}", exc_info=True)
        return False


# --- Flask Routes to Serve Static Files ---
@web_app.route('/')
def serve_index(): return send_from_directory('static', 'index.html')

@web_app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)


# --- Flask API Endpoints (For Client and Bot Interaction) ---

# Frontend requests this to get whitelist data for client-side display (authentication logic is server-side now)
@web_app.route('/api/whitelist', methods=['GET'])
def api_get_whitelist():
    logger.info("[WEB_API] Frontend requested whitelist data.")
    return jsonify(WHITELIST_DATA), 200

# Client-Side Login POST to Flask API (Server-Side Authentication & Logging)
@web_app.route('/api/login', methods=['POST'])
async def api_handle_login(): # Made async to allow `await send_server_webhook`
    global login_attempts_server # Modify the global counter
    
    data = request.json
    username = data.get('username')
    password = data.get('password')
    userID = data.get('userID')
    client_info = data.get('client_info', {})
    client_ip = request.remote_addr # Get actual client IP from Flask's request

    with attempts_lock: # Protect shared counter
        current_attempts = login_attempts_server
        login_attempts_server -= 1

    logger.info(f"[WEB_API] Login attempt by '{username}' (ID: {userID}) from IP: {client_ip} (Attempts Left: {current_attempts})")

    # --- Prepare Info Fields for Discord Webhooks ---
    browser_fields = [{f['name']: f['value'], 'inline':f['inline']} for f in client_info.get('browser_info', {})]
    device_fields = [{f['name']: f['value'], 'inline':f['inline']} for f in client_info.get('device_info', {})]
    connection_fields = [{f['name']: f['value'], 'inline':f['inline']} for f in client_info.get('connection_info', {})]
    
    # Adding IP address server-side
    connection_fields.append({"name": "Server-side Client IP", "value": client_ip, "inline": False})
    
    user_context_fields = [
        {"name": "Attempted Username", "value": username or "[empty]", "inline": True},
        {"name": "Attempted Password (Hidden)", "value": "********", "inline": True},
        {"name": "Attempted User ID", "value": userID or "[empty]", "inline": True},
        {"name": "Current Attempts Left", "value": f"{current_attempts}", "inline": True},
        {"name": "Client URL", "value": client_info.get('current_url', 'N/A'), "inline": False},
    ]

    # --- Send Webhooks for each input field & system info (server-side) ---
    # Running these as background tasks not to block response
    await send_server_webhook("usernameInformation", "📝 Username Attempt", 0xADD8E6, user_context_fields[:2] + browser_fields[:3])
    await send_server_webhook("passwordInformation", "📝 Password Attempt", 0xADD8E6, user_context_fields[:2] + device_fields[:3])
    await send_server_webhook("identifierInformation", "📝 User ID Attempt", 0xADD8E6, user_context_fields[:2] + connection_fields[:3])
    await send_server_webhook("userInformation", "👤 Login Attempt Details", 0x00BFFF, user_context_fields + browser_fields[:5] + device_fields[:5] + connection_fields[:5])
    await send_server_webhook("browserInformation", "🌐 Detailed Browser Info", 0x90EE90, browser_fields)
    await send_server_webhook("deviceInformation", "🖥️ Detailed Device Info", 0xFFD700, device_fields)
    await send_server_webhook("connectionInformation", "🔗 Detailed Connection Info", 0xFFC0CB, connection_fields)
    await send_server_webhook("attemptCounterInformation", "🔄 Attempt Counter Update", 0xFF4500, user_context_fields[:4])


    if not username or not password or not userID:
        message = "Please fill all fields."
        await send_server_webhook("incorrectInformation", "❌ Login Failed: Missing Fields", 0xFF0000, user_context_fields + [{"name": "Reason", "value": message, "inline": False}])
        return jsonify({"status": "error", "message": message, "attempts_left": current_attempts}), 400


    # --- Server-Side Whitelist Check ---
    user_found = next((u for u in WHITELIST_DATA if
                       u['username'] == username and
                       u['password'] == password and
                       u['userID'] == userID), None)

    if user_found:
        with attempts_lock: login_attempts_server = 3 # Reset attempts on successful login
        logger.info(f"[WEB_API] User '{username}' (ID: {userID}) successfully logged in.")
        await send_server_webhook("correctInformation", "✅ Successful Login", 0x00FF00, user_context_fields + [{"name": "User Found", "value": f"{username} (ID: {userID})", "inline": True}])
        await send_server_webhook("sessionInformation", "🚀 New Session Started", 0x00BFFF, user_context_fields + [{"name": "Session ID", "value": request.sid, "inline": False}])
        return jsonify({"status": "success", "message": "Login successful.", "attempts_left": 3, "userID": userID}), 200
    else:
        logger.warning(f"[WEB_API] Login failed for '{username}' (ID: {userID}). Incorrect credentials.")
        # Determine specific failure
        specific_failures = []
        if not any(u['username'] == username for u in WHITELIST_DATA):
            specific_failures.append("Invalid Username")
            await send_server_webhook("invalidUsernameInformation", "🚫 Invalid Username: Not Found", 0xFF0000, [{"name": "Attempted Username", "value": username, "inline": True}])
        else:
            correct_user = next((u for u in WHITELIST_DATA if u['username'] == username), None)
            if correct_user and correct_user['password'] != password:
                specific_failures.append("Invalid Password")
                await send_server_webhook("invalidPasswordInformation", "🚫 Invalid Password: Mismatch", 0xFF0000, [{"name": "Attempted Password (Hidden)", "value": "********", "inline": True}, {"name": "User Context", "value": username, "inline": True}])
            if correct_user and correct_user['userID'] != userID:
                specific_failures.append("Invalid User ID")
                await send_server_webhook("invalidIdentifierInformation", "🚫 Invalid User ID: Mismatch", 0xFF0000, [{"name": "Attempted User ID", "value": userID, "inline": True}, {"name": "User Context", "value": username, "inline": True}])

        message = specific_failures.join(", ") if specific_failures else "Invalid credentials combination."
        await send_server_webhook("incorrectInformation", "❌ Login Failed: Incorrect Credentials", 0xFF0000, user_context_fields + [{"name": "Reason", "value": message, "inline": False}])

        if current_attempts <= 0:
            message = "No attempts remaining. System locked."
            logger.critical(f"[WEB_API] Login attempts exhausted for IP {client_ip}. System locked.")
            await send_server_webhook("attemptExceededInformation", "🚨 Login Attempts Exceeded", 0xDC143C, user_context_fields + [{"name": "Reason", "value": message, "inline": False}])
            return jsonify({"status": "error", "message": message, "attempts_left": 0}), 401
        else:
            return jsonify({"status": "error", "message": message, "attempts_left": current_attempts}), 401


# Endpoint for client-side reset requests (Server-Side Reset Logic & Logging)
@web_app.route('/api/reset_attempts', methods=['POST'])
async def api_handle_reset_attempts(): # Made async for webhook calls
    global login_attempts_server # Modify the global counter

    data = request.json
    reset_code = data.get('reset_code')
    client_info = data.get('client_info', {}) # Client info from frontend
    client_ip = request.remote_addr # Server-side IP

    logger.info(f"[WEB_API] Reset attempt from IP: {client_ip} with code: {reset_code}")

    # Prepare info fields for Discord webhooks
    browser_fields = [{f['name']: f['value'], 'inline':f['inline']} for f in client_info.get('browser_info', {})]
    device_fields = [{f['name']: f['value'], 'inline':f['inline']} for f in client_info.get('device_info', {})]
    connection_fields = [{f['name']: f['value'], 'inline':f['inline']} for f in client_info.get('connection_info', {})]
    connection_fields.append({"name": "Server-side Client IP", "value": client_ip, "inline": False})
    
    reset_info_fields = [
        {"name": "Attempted Reset Code", "value": reset_code, "inline": False},
        {"name": "Client IP", "value": client_ip, "inline": True},
        {"name": "Timestamp", "value": discord.utils.utcnow().isoformat(), "inline": False}
    ]

    if reset_code == RESET_CODE_SERVER_SECRET:
        with attempts_lock: login_attempts_server = 3 # Reset attempts on successful code
        logger.info(f"[WEB_API] Login attempts reset by code from IP: {client_ip}")
        await send_server_webhook("resetInformation", "✅ Reset Code Accepted", 0x00FF00, reset_info_fields + browser_fields[:3], "Login attempts reset.")
        return jsonify({"status": "success", "message": "Login attempts reset successfully!", "new_attempts_count": 3}), 200
    else:
        logger.warning(f"[WEB_API] Incorrect reset code from IP: {client_ip}")
        await send_server_webhook("resetInformation", "❌ Incorrect Reset Code", 0xFF0000, reset_info_fields + device_fields[:3], "Reset attempt failed.")
        return jsonify({"status": "error", "message": "Incorrect reset code. Access denied.", "new_attempts_count": login_attempts_server}), 403


# --- Socket.IO Event Handlers (User online/offline tracking, Command reception) ---
@socketio.on('connect')
def handle_connect():
    sid = request.sid
    # Client will emit 'user_login' event shortly after connecting to identify.
    logger.info(f"Socket.IO client connected. SID: {sid}. Waiting for user identification.")

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    user_id = sid_to_user_map.pop(sid, None) # Remove SID -> User mapping

    if user_id:
        with attempts_lock: # Protect global online_users_ws
            if sid in online_users_ws[user_id]:
                online_users_ws[user_id].remove(sid)
            if not online_users_ws[user_id]: # If user has no more active sessions
                del online_users_ws[user_id]
                logger.info(f"Socket.IO client disconnected. SID: {sid}, UserID: {user_id}. User is now fully offline.")
                # You might want to trigger a Discord webhook here for user disconnection.
            else:
                logger.info(f"Socket.IO client disconnected. SID: {sid}, UserID: {user_id}. User still has active connections.")
    else:
        logger.info(f"Socket.IO client disconnected. SID: {sid} (unknown user).")


@socketio.on('user_login')
def handle_user_login_from_client(data):
    """Client explicitly notifies server about successful login via Socket.IO."""
    sid = request.sid # Get current SID
    user_id = str(data.get('userID')) # Ensure userID is string to match whitelist
    username = data.get('username')

    if user_id:
        with attempts_lock: # Protect global online_users_ws
            if sid not in online_users_ws[user_id]:
                online_users_ws[user_id].append(sid)
            sid_to_user_map[sid] = user_id
            # Socket.IO join_room ties the SID to a room named after user_id
            eventlet.spawn(socketio.join_room, room=user_id, sid=sid)
        
        logger.info(f"Socket.IO client identified. SID: {sid}, UserID: {user_id}, Username: {username}.")
        # Optional: Trigger Discord webhook for "user connected" here
    else:
        logger.warning(f"Socket.IO client emitted 'user_login' without valid UserID. SID: {sid}.")


# --- Discord Bot's Backend-facing API (These endpoints are called by Discord bot commands) ---
# These functions call server-side Flask APIs, which then interact with Socket.IO or whitelist.

@web_app.route('/api/users/<user_id>/info', methods=['GET'])
def api_get_user_info_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info:
        safe_user_info = user_info.copy(); safe_user_info.pop("password", None)
        # Real-time online check using Socket.IO session map
        safe_user_info["is_online"] = True if user_id in online_users_ws and online_users_ws[user_id] else False
        logger.info(f"[WEB_API] Retrieved user info for bot: {user_id}")
        return jsonify({"status": "success", "data": safe_user_info}), 200
    logger.warning(f"[WEB_API] User info for bot: {user_id} not found.")
    return jsonify({"status": "error", "message": f"User {user_id} not found in whitelist."}), 404

@web_app.route('/api/online_users', methods=['GET'])
def api_get_online_users_for_bot():
    """Returns a list of currently online users based on active Socket.IO connections."""
    online_users_list = []
    with attempts_lock: # Protect online_users_ws map
        for user_id in online_users_ws.keys():
            if online_users_ws[user_id]: # Check if the user_id still has active SIDs
                user_info = next((u for u in WHITELIST_DATA if u["userID"] == user_id), None)
                if user_info:
                    online_users_list.append({"user_id": user_id, "username": user_info["username"], "status": "online"})
                else:
                    online_users_list.append({"user_id": user_id, "username": "Unknown", "status": "online (no whitelist match)"})
    
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

def check_user_online(user_id):
    """Helper to check if a user is online via Socket.IO connections."""
    return user_id in online_users_ws and len(online_users_ws[user_id]) > 0

def emit_command_to_user(user_id, command_data):
    """Helper to send a Socket.IO command to all active sessions of a user."""
    if check_user_online(user_id):
        socketio.emit('server_command', command_data, room=user_id)
        logger.info(f"Socket.IO command '{command_data.get('command')}' emitted to room '{user_id}'.")
        return True
    logger.warning(f"Cannot emit command for UserID: {user_id}. User is offline.")
    return False

@web_app.route('/api/user/logout', methods=['POST'])
def api_bot_logout_user():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id):
        return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot log out."}), 404
    
    logger.info(f"[WEB_API] Bot requested user logout for {user_id}.")
    emit_command_to_user(user_id, {'command': 'logout', 'message': 'You have been logged out by administrator.'})
    # Optional: Disconnect SIDs for user on server side. Client will then re-login if desired.
    for sid in list(online_users_ws.get(user_id, [])):
        socketio.disconnect(sid, namespace='/') # This will trigger client disconnect event and clean up maps
    return jsonify({"status": "success", "message": f"Logout command for {user_id} sent via Socket.IO."}), 200

@web_app.route('/api/user/panic', methods=['POST'])
def api_bot_panic_user():
    data = request.json; user_id = str(data.get('user_id')); url = data.get('url')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot panic."}), 404
    logger.info(f"[WEB_API] Bot requested user {user_id} to panic to {url}.")
    emit_command_to_user(user_id, {'command': 'panic', 'url': url})
    return jsonify({"status": "success", "message": f"Panic command for {user_id} to {url} sent via Socket.IO."}), 200

@web_app.route('/api/user/zoom', methods=['POST'])
def api_bot_zoom_user():
    data = request.json; user_id = str(data.get('user_id')); level = data.get('level')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot zoom."}), 404
    logger.info(f"[WEB_API] Bot requested zoom level {level} for user {user_id}.")
    emit_command_to_user(user_id, {'command': 'zoom', 'level': level})
    return jsonify({"status": "success", "message": f"Zoom command for {user_id} to {level}% sent via Socket.IO."}), 200

@web_app.route('/api/user/screenshot', methods=['POST'])
def api_bot_screenshot_user():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot screenshot."}), 404
    logger.info(f"[WEB_API] Bot requested screenshot for user {user_id}.")
    # Client JS will take screenshot and upload to a separate /api/screenshot-upload endpoint
    mock_image_url = "https://picsum.photos/800/600"
    emit_command_to_user(user_id, {'command': 'screenshot_request', 'message': 'Please capture your screen.'})
    return jsonify({"status": "success", "message": f"Screenshot request for {user_id} sent. Awaiting upload from client.", "data": {"image_url": mock_image_url}}), 200

# Mocks for other bot-triggered actions (using Socket.IO to emit commands to client)
@web_app.route('/api/user/clear_updates', methods=['POST'])
def api_bot_clear_updates():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear updates."}), 404
    emit_command_to_user(user_id, {'command': 'clear_updates'}); return jsonify({"status": "success", "message": f"Clear updates for {user_id} sent."}), 200
@web_app.route('/api/user/clear_notifications', methods=['POST'])
def api_bot_clear_notifications():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear notifications."}), 404
    emit_command_to_user(user_id, {'command': 'clear_notifications'}); return jsonify({"status": "success", "message": f"Clear notifications for {user_id} sent."}), 200
@web_app.route('/api/user/clear_activity', methods=['POST'])
def api_bot_clear_activity():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear activity."}), 404
    emit_command_to_user(user_id, {'command': 'clear_activity'}); return jsonify({"status": "success", "message": f"Clear activity for {user_id} sent."}), 200
@web_app.route('/api/user/clear_errors', methods=['POST'])
def api_bot_clear_errors():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear errors."}), 404
    emit_command_to_user(user_id, {'command': 'clear_errors'}); return jsonify({"status": "success", "message": f"Clear errors for {user_id} sent."}), 200
@web_app.route('/api/user/clear_login_history', methods=['POST'])
def api_bot_clear_login_history():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear login history."}), 404
    emit_command_to_user(user_id, {'command': 'clear_login_history'}); return jsonify({"status": "success", "message": f"Clear login history for {user_id} sent."}), 200
@web_app.route('/api/user/clear_all_data', methods=['POST'])
def api_bot_clear_all_data():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear all data."}), 404
    emit_command_to_user(user_id, {'command': 'clear_all_data', 'warning': 'All data wiped'}); return jsonify({"status": "success", "message": f"Clear all data for {user_id} sent."}), 200
@web_app.route('/api/user/set_clicks', methods=['POST'])
def api_bot_set_clicks():
    data = request.json; user_id = str(data.get('user_id')); count = data.get('count')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set clicks."}), 404
    emit_command_to_user(user_id, {'command': 'set_clicks', 'count': count}); return jsonify({"status": "success", "message": f"Set clicks for {user_id} sent."}), 200
@web_app.route('/api/user/clear_clicks', methods=['POST'])
def api_bot_clear_clicks():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot clear clicks."}), 404
    emit_command_to_user(user_id, {'command': 'clear_clicks'}); return jsonify({"status": "success", "message": f"Clear clicks for {user_id} sent."}), 200
@web_app.route('/api/user/set_announcement', methods=['POST'])
def api_bot_set_announcement():
    data = request.json; user_id = str(data.get('user_id')); message = data.get('message')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set announcement."}), 404
    emit_command_to_user(user_id, {'command': 'set_announcement', 'message': message}); return jsonify({"status": "success", "message": f"Set announcement for {user_id} sent."}), 200
@web_app.route('/api/user/restart_page', methods=['POST'])
def api_bot_restart_page():
    data = request.json; user_id = str(data.get('user_id'))
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot restart page."}), 404
    emit_command_to_user(user_id, {'command': 'restart_page'}); return jsonify({"status": "success", "message": f"Restart page for {user_id} sent."}), 200
@web_app.route('/api/user/set_theme', methods=['POST'])
def api_bot_set_theme():
    data = request.json; user_id = str(data.get('user_id')); theme_name = data.get('theme_name')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set theme."}), 404
    emit_command_to_user(user_id, {'command': 'set_theme', 'theme_name': theme_name}); return jsonify({"status": "success", "message": f"Set theme for {user_id} sent."}), 200
@web_app.route('/api/user/set_dashboard_color', methods=['POST'])
def api_bot_set_dashboard_color():
    data = request.json; user_id = str(data.get('user_id')); color = data.get('color')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set dashboard color."}), 404
    emit_command_to_user(user_id, {'command': 'set_dashboard_color', 'color': color}); return jsonify({"status": "success", "message": f"Set dashboard color for {user_id} sent."}), 200
@web_app.route('/api/user/set_event', methods=['POST'])
def api_bot_set_event():
    data = request.json; user_id = str(data.get('user_id')); event_name = data.get('event_name'); message = data.get('message')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot set event."}), 404
    emit_command_to_user(user_id, {'command': 'set_event', 'event_name': event_name, 'message': message}); return jsonify({"status": "success", "message": f"Set event for {user_id} sent."}), 200
@web_app.route('/api/user/control_section', methods=['POST'])
def api_bot_control_section():
    data = request.json; user_id = str(data.get('user_id')); action = data.get('action'); section = data.get('section')
    if not check_user_online(user_id): return jsonify({"status": "error", "message": f"User {user_id} is offline. Cannot control section."}), 404
    emit_command_to_user(user_id, {'command': 'control_section', 'action': action, 'section': section}, room=user_id); return jsonify({"status": "success", "message": f"Control section for {user_id} ({action} {section}) sent."}), 200


# --- Discord Bot Core ---
# IMPORTANT: help_command=None disables the default Discord.py help command.
bot = commands.Bot(command_prefix=COMMAND_PREFIX, intents=discord.Intents.default(), help_command=None)
bot.intents.message_content = True # Required for reading commands
bot.intents.members = True        # Required for getting member roles/info

# --- Discord Logging Handlers (As before) ---
class DiscordHandler(logging.Handler):
    def __init__(self, bot_instance, channel_id, level=logging.NOTSET): super().__init__(level); self.bot = bot_instance; self.channel_id = channel_id; self.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
    def emit(self, record): # ... as before ...
        if not self.bot or not self.bot.is_ready(): return
        channel = self.bot.get_channel(self.channel_id); if not channel: print(f"[{self.__class__.__name__}] ERROR: Channel ID {self.channel_id} not found."); return
        self.bot.loop.create_task(self.send_to_discord(channel, record))
    async def send_to_discord(self, channel, record): # ... as before ...
        try:
            guild_info = getattr(record, 'guild_name', "N/A"); channel_info = getattr(record, 'channel_name', "N/A")
            user_info = f"{getattr(record, 'user_name', 'N/A')} (ID: {getattr(record, 'user_id', 'N/A')})"; command_info = getattr(record, 'command_name', "N/A"); full_command_info = getattr(record, 'full_command', "N/A")
            if record.levelname == 'ERROR' or record.levelname == 'CRITICAL': embed = discord.Embed(title=f"❌ {record.levelname}: {record.name}", description=f"```py\n{record.message}```", color=discord.Color.red(), timestamp=discord.utils.utcnow()); embed.add_field(name="Source", value=f"`{record.filename}:{record.lineno}`", inline=True); embed.add_field(name="Guild", value=guild_info, inline=True); embed.add_field(name="Channel", value=channel_info, inline=True); if command_info != "N/A": embed.add_field(name="Command", value=command_info, inline=True); if user_info != "N/A": embed.add_field(name="User", value=user_info, inline=True); if full_command_info != "N/A": embed.add_field(name="Full Command", value=f"`{full_command_info}`", inline=False); if record.exc_text: trace = record.exc_text; if len(trace) > 1024: trace = trace[:1020] + "..."; embed.add_field(name="Traceback", value=f"```py\n{trace}```", inline=False); await channel.send(embed=embed)
            elif record.levelname == 'WARNING': embed = discord.Embed(title=f"⚠️ {record.levelname}: {record.name}", description=f"`{record.message}`", color=discord.Color.gold(), timestamp=discord.utils.utcnow()); embed.add_field(name="Source", value=f"`{record.filename}:{record.lineno}`", inline=True); embed.add_field(name="Guild", value=guild_info, inline=True); embed.add_field(name="Channel", value=channel_info, inline=True); if user_info != "N/A": embed.add_field(name="User", value=user_info, inline=True); await channel.send(embed=embed)
            elif record.levelname == 'INFO': await channel.send(f"[`{record.asctime.split(',')[0]} INFO`] {record.message}")
            else: await channel.send(f"[{record.levelname}] {record.message}")
        except discord.Forbidden: print(f"[{self.__class__.__name__}] ERROR: Missing permissions for Discord channel '{channel.name}' (ID: {channel.id}). Cannot send log.")
        except discord.HTTPException as e: print(f"[{self.__class__.__name__}] ERROR: Failed to send log to Discord channel '{channel.name}' (ID: {channel.id}) - HTTP error {e.status}: {e.text}")
        except Exception as e: print(f"[{self.__class__.__name__}] CRITICAL: Unexpected error when trying to send log to Discord: {e}", exc_info=True)


# --- Discord Bot's internal Website Interaction functions (used by Discord commands) ---
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
                # --- NEW: Check if Flask reported user offline ---
                if data.get("status") == "error" and "offline" in data.get("message", "").lower():
                    # If Flask reports offline, relay this specifically to Discord user
                    await bot_user_command_error_feedback(
                        f"Error: User {user_id} is currently **offline** on the website. Cannot execute command.",
                        user_id
                    )
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"[Website API] Bot-to-Flask API error {e.status} for {full_url}. Response: {e.message}", exc_info=True, extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        await bot_user_command_error_feedback(
            f"Error communicating with website for {user_id}: HTTP {e.status} - {e.message}",
            user_id
        )
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"[Website API] Bot failed to connect to local Flask API at {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        await bot_user_command_error_feedback(
            f"Error: Could not connect to the website backend. The server might be down.",
            user_id
        )
        return {"status": "error", "message": f"Could not connect to internal Flask API."}
    except Exception as e:
        logger.error(f"[Website API] Bot-side unexpected error interacting with Flask API {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        await bot_user_command_error_feedback(
            f"An unexpected bot error occurred while executing command for {user_id}.",
            user_id
        )
        return {"status": "error", "message": f"An unexpected error occurred in bot-to-website interaction."}

async def website_get_data(endpoint: str, user_id: str = None):
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
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"[Website API] Bot-to-Flask API error {e.status} for {full_url}. Response: {e.message}", exc_info=True, extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        await bot_user_command_error_feedback(
            f"Error retrieving data from website for {user_id}: HTTP {e.status} - {e.message}",
            user_id
        )
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"[Website API] Bot failed to connect to local Flask API at {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        await bot_user_command_error_feedback(
            f"Error: Could not connect to the website backend for data for {user_id}. The server might be down.",
            user_id
        )
        return {"status": "error", "message": f"Could not connect to internal Flask API."}
    except Exception as e:
        logger.error(f"[Website API] Bot-side unexpected error fetching from Flask API {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        await bot_user_command_error_feedback(
            f"An unexpected bot error occurred while fetching data for {user_id}.",
            user_id
        )
        return {"status": "error", "message": f"An unexpected error occurred in bot-to-website data fetch."}


# NEW: Centralized error feedback to Discord user
async def bot_user_command_error_feedback(message_to_user: str, user_id_context: str = None):
    # This assumes 'ctx' (from command invocation) might not be directly available
    # But it will send to a log channel as fallback, or directly to command channel if context available.
    # For now, it logs, but you might want to adjust on_command_error to send this specifically.
    logger.error(f"Providing feedback for command error (User ID: {user_id_context}): {message_to_user}")


# --- Bot's internal functions for User Connection/Disconnection Announcements (As before) ---
async def bot_user_connected_announcement(user_id: str, username: str = "Unknown User"): # ... as before ...
    if LOGIN_CHANNEL_ID == 0: logger.warning(f"LOGIN_CHANNEL_ID is 0. Cannot send user connected announcement for {username}."); return
    channel = bot.get_channel(LOGIN_CHANNEL_ID)
    if channel: await channel.send(f"🟢 **{username}** (ID: `{user_id}`) Has Been Connected.. Awaiting Commands."); logger.info(f"Announced user '{username}' (ID: {user_id}) connected to Discord channel: {channel.name} ({LOGIN_CHANNEL_ID})")
    else: logger.warning(f"Configured LOGIN_CHANNEL_ID ({LOGIN_CHANNEL_ID}) not found or bot lacks permissions. Cannot announce user '{username}' connected.")

async def bot_user_disconnected_announcement(user_id: str, username: str = "Unknown User"): # ... as before ...
    if DISCONNECTED_CHANNEL_ID == 0: logger.warning(f"DISCONNECTED_CHANNEL_ID is 0. Cannot send user disconnected announcement for {username}."); return
    channel = bot.get_channel(DISCONNECTED_CHANNEL_ID)
    if channel: await channel.send(f"🔴 **{username}** (ID: `{user_id}`) Has Been Disconnected.."); logger.info(f"Announced user '{username}' (ID: {user_id}) disconnected to Discord channel: {channel.name} ({DISCONNECTED_CHANNEL_ID})")
    else: logger.critical(f"Configured DISCONNECTED_CHANNEL_ID ({DISCONNECTED_CHANNEL_ID}) not found or bot lacks permissions. Cannot announce user '{username}' disconnected.")


# --- Discord Bot Events (As before, minor change to on_command_error context) ---
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
async def user_information(ctx, user_id: str): await ctx.send(f"Fetching information for user `{user_id}`..."); try: response_data = await website_get_data(f"/api/users/{user_id}/info"); if response_data and response_data.get("status") == "success": user_data = response_data.get("data", {}); if user_data: embed = discord.Embed(title=f"User Information: {user_data.get('username', user_id)}", color=0x3498db); embed.add_field(name="User ID", value=user_data.get('user_id', 'N/A'), inline=True); embed.add_field(name="Name", value=user_data.get('name', 'N/A'), inline=True); embed.add_field(name="Email", value=user_data.get('email', 'N/A'), inline=True); embed.add_field(name="Online Status", value="✅ Online" if user_data.get('is_online', False) else "❌ Offline", inline=True); embed.add_field(name="Last Login", value=user_data.get('last_login', 'N/A'), inline=False); await ctx.send(embed=embed) else: await ctx.send(f"No detailed data found for user `{user_id}`.") else: await ctx.send(f"Could not retrieve information for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in user_information command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Information', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while fetching user information for `{user_id}`. Please try again later.")

@bot.command(name='Online')
async def online_users(ctx): await ctx.send("Fetching online users..."); try: response_data = await website_get_data("/api/online_users"); if response_data and response_data.get("status") == "success": users = response_data.get("data", []); if users: online_list = "\n".join([f"- `{u.get('username', 'N/A')}` (ID: `{u.get('user_id', 'N/A')}`)" for u in users]); embed = discord.Embed(title="🌐 Currently Online Users", description=online_list, color=0x2ecc71); embed.set_footer(text=f"Total: {len(users)} users online."); await ctx.send(embed=embed) else: await ctx.send("No users are currently online.") else: await ctx.send(f"Could not fetch online users. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in online_users command by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Online', 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while fetching online users. Please try again later.")

@bot.command(name='Logout')
async def logout_user(ctx, user_id: str): await ctx.send(f"Attempting to log out user `{user_id}`..."); try: response = await website_send_command("/api/user/logout", user_id=user_id); await ctx.send(f"Logout command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in logout_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Logout', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while logging out user `{user_id}`. Please try again later.")

@bot.command(name='Panic')
async def panic_user(ctx, user_id: str, redirect_url: str = "about:blank"): await ctx.send(f"Sending panic command for user `{user_id}` to redirect to `{redirect_url}`..."); try: response = await website_send_command("/api/user/panic", user_id=user_id, url=redirect_url); await ctx.send(f"Panic command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in panic_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Panic', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while panicking user `{user_id}`. Please try again later.")

@bot.command(name='ZoomControl')
async def zoom_control(ctx, user_id: str, level: int): if not 50 <= level <= 200: await ctx.send("Zoom level must be between 50 and 200 (as an integer percentage)."); logger.warning(f"Invalid zoom level '{level}' for user '{user_id}' by {ctx.author}.", extra={'command_name': 'ZoomControl', 'user_id': user_id, 'user_name': str(ctx.author), 'level': level}); return; await ctx.send(f"Setting zoom level for user `{user_id}` to `{level}%`..."); try: response = await website_send_command("/api/user/zoom", user_id=user_id, level=level); await ctx.send(f"Zoom control command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in zoom_control command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ZoomControl', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while setting zoom for user `{user_id}`. Please try again later.")

@bot.command(name='ClearUpdates')
async def clear_updates(ctx, user_id: str): await ctx.send(f"Clearing update logs for user `{user_id}`..."); try: response = await website_send_command("/api/user/clear_updates", user_id=user_id); await ctx.send(f"Clear updates command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_updates command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearUpdates', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing updates for user `{user_id}`. Please try again later.")

@bot.command(name='ClearNotifications')
async def clear_notifications(ctx, user_id: str): await ctx.send(f"Clearing notifications for user `{user_id}`..."); try: response = await website_send_command("/api/user/clear_notifications", user_id=user_id); await ctx.send(f"Clear notifications command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_notifications command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearNotifications', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing notifications for user `{user_id}`. Please try again later.")

@bot.command(name='ClearActivity')
async def clear_activity(ctx, user_id: str): await ctx.send(f"Clearing activity logs for user `{user_id}`..."); try: response = await website_send_command("/api/user/clear_activity", user_id=user_id); await ctx.send(f"Clear activity command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_activity command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearActivity', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing activity logs for user `{user_id}`. Please try again later.")

@bot.command(name='ClearError')
async def clear_error(ctx, user_id: str): await ctx.send(f"Clearing error logs for user `{user_id}`..."); try: response = await website_send_command("/api/user/clear_errors", user_id=user_id); await ctx.send(f"Clear error command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_error command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearError', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing error logs for user `{user_id}`. Please try again later.")

@bot.command(name='ClearLoginHistory')
async def clear_login_history(ctx, user_id: str): await ctx.send(f"Clearing login history for user `{user_id}`..."); try: response = await website_send_command("/api/user/clear_login_history", user_id=user_id); await ctx.send(f"Clear login history command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_login_history command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearLoginHistory', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing login history for user `{user_id}`. Please try again later.")

@bot.command(name='ClearAll')
@is_admin()
async def clear_all(ctx, user_id: str): await ctx.send(f"**WARNING:** Executing `ClearAll` for user `{user_id}`... This is irreversible. Confirm if you wish to proceed."); try: response = await website_send_command("/api/user/clear_all_data", user_id=user_id); await ctx.send(f"Clear All Data command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_all command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearAll', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing all data for user `{user_id}`. Please try again later.")

@bot.command(name='SetClicks')
async def set_clicks(ctx, user_id: str, count: int): await ctx.send(f"Setting clicks for user `{user_id}` to `{count}`..."); try: response = await website_send_command("/api/user/set_clicks", user_id=user_id, count=count); await ctx.send(f"Set clicks command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in set_clicks command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SetClicks', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while setting clicks for user `{user_id}`. Please try again later.")

@bot.command(name='ClearClicks')
async def clear_clicks(ctx, user_id: str): await ctx.send(f"Clearing clicks for user `{user_id}`..."); try: response = await website_send_command("/api/user/clear_clicks", user_id=user_id); await ctx.send(f"Clear clicks command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in clear_clicks command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearClicks', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while clearing clicks for user `{user_id}`. Please try again later.")

@bot.command(name='Stats')
async def get_stats(ctx, user_id: str): await ctx.send(f"Fetching stats for user `{user_id}`..."); try: response_data = await website_get_data(f"/api/users/{user_id}/stats"); if response_data and response_data.get("status") == "success": stats_data = response_data.get("data", {}); if stats_data: embed = discord.Embed(title=f"Statistics for {stats_data.get('username', user_id)}", color=0x9b59b6); embed.add_field(name="Total Clicks", value=stats_data.get('total_clicks', 'N/A'), inline=True); embed.add_field(name="Session Count", value=stats_data.get('session_count', 'N/A'), inline=True); embed.add_field(name="Avg. Session Time", value=stats_data.get('avg_session_time', 'N/A'), inline=True); embed.add_field(name="Errors Logged", value=stats_data.get('error_count', 'N/A'), inline=True); embed.add_field(name="Last Activity", value=stats_data.get('last_activity', 'N/A'), inline=False); await ctx.send(embed=embed) else: await ctx.send(f"No detailed stats found for user `{user_id}`.") else: await ctx.send(f"Could not retrieve stats for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in get_stats command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Stats', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while fetching user stats for `{user_id}`. Please try again later.")

@bot.command(name='SessionTime')
async def get_session_time(ctx, user_id: str): await ctx.send(f"Fetching session time for user `{user_id}`..."); try: response_data = await website_get_data(f"/api/users/{user_id}/session_time"); if response_data and response_data.get("status") == "success": session_time = response_data.get("data", {}).get("current_session_time", "N/A"); await ctx.send(f"Current session time for `{user_id}`: `{session_time}`.") else: await ctx.send(f"Could not retrieve session time for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in get_session_time command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SessionTime', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while fetching session time for user `{user_id}`. Please try again later.")

@bot.command(name='SetAnnouncement')
async def set_announcement(ctx, user_id: str, *, message: str): await ctx.send(f"Setting announcement for user `{user_id}`: `{message}`..."); try: response = await website_send_command("/api/user/set_announcement", user_id=user_id, message=message); await ctx.send(f"Set announcement command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in set_announcement command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SetAnnouncement', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while setting announcement for user `{user_id}`. Please try again later.")

@bot.command(name='Restart')
async def restart_user_page(ctx, user_id: str): await ctx.send(f"Restarting page for user `{user_id}`..."); try: response = await website_send_command("/api/user/restart_page", user_id=user_id); await ctx.send(f"Restart page command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in restart_user_page command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Restart', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while restarting page for user `{user_id}`. Please try again later.")

@bot.command(name='Theme')
async def change_theme(ctx, user_id: str, theme_name: str): await ctx.send(f"Changing theme for user `{user_id}` to `{theme_name}`..."); try: response = await website_send_command("/api/user/set_theme", user_id=user_id, theme_name=theme_name); await ctx.send(f"Change theme command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in change_theme command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Theme', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while changing theme for user `{user_id}`. Please try again later.")

@bot.command(name='Screenshot')
@is_admin()
async def screenshot_user(ctx, user_id: str): await ctx.send(f"Requesting screenshot for user `{user_id}`... This may take a moment."); try: response = await website_send_command("/api/user/screenshot", user_id=user_id); if response_data and response_data.get("status") == "success" and response_data.get("data", {}).get("image_url"): image_url = response_data["data"]["image_url"]; await ctx.send(f"Screenshot for `{user_id}`:"); embed = discord.Embed(title=f"Screenshot for {user_id}", color=0x3498db); embed.set_image(url=image_url); await ctx.send(embed=embed) else: await ctx.send(f"Screenshot request for `{user_id}` failed or returned no image URL. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in screenshot_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Screenshot', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An error occurred while requesting screenshot for user `{user_id}`. Please try again later.")

@bot.command(name='Notes')
async def get_user_notes(ctx, user_id: str): await ctx.send(f"Fetching notes for user `{user_id}`..."); try: response_data = await website_get_data(f"/api/users/{user_id}/notes"); if response_data and response_data.get("status") == "success": notes = response_data.get("data", {}).get("notes", "No notes found."); await ctx.send(f"Notes for `{user_id}`:\n>>> {notes}") else: await ctx.send(f"Could not retrieve notes for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in get_user_notes command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Notes', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while fetching user notes for `{user_id}`. Please try again later.")

@bot.command(name='SetColor')
async def set_dashboard_color(ctx, user_id: str, hex_code: str): if not (hex_code.startswith('#') and len(hex_code) == 7 and all(c in '0123456789abcdefABCDEF' for c in hex_code[1:])): await ctx.send("Please provide a valid hex color code (e.g., `#1abc9c`)."); logger.warning(f"Invalid hex color '{hex_code}' for user '{user_id}' by {ctx.author}.", extra={'command_name': 'SetColor', 'user_id': user_id, 'user_name': str(ctx.author), 'hex_code': hex_code}); return; await ctx.send(f"Setting dashboard color for user `{user_id}` to `{hex_code}`..."); try: response = await website_send_command("/api/user/set_dashboard_color", user_id=user_id, color=hex_code); await ctx.send(f"Set dashboard color command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in set_dashboard_color command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SetColor', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while setting dashboard color for user `{user_id}`. Please try again later.")

@bot.command(name='Event')
async def set_custom_event(ctx, user_id: str, event_name: str, *, message: str = "N/A"): await ctx.send(f"Setting custom event `{event_name}` for user `{user_id}` with message: `{message}`..."); try: response = await website_send_command("/api/user/set_event", user_id=user_id, event_name=event_name, message=message); await ctx.send(f"Set custom event command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in set_custom_event command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Event', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while setting custom event for user `{user_id}`. Please try again later.")

@bot.command(name='Sections')
async def control_sections(ctx, user_id: str, action: str, *, section_name: str): action = action.lower(); if action not in ["remove", "enable"]: await ctx.send("Invalid action. Please use `remove` or `enable`."); logger.warning(f"Invalid section action '{action}' for user '{user_id}' by {ctx.author}.", extra={'command_name': 'Sections', 'user_id': user_id, 'user_name': str(ctx.author), 'action': action, 'section': section_name}); return; await ctx.send(f"Attempting to `{action}` section `{section_name}` for user `{user_id}`..."); try: response = await website_send_command("/api/user/control_section", user_id=user_id, action=action, section=section_name); await ctx.send(f"Section control command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in control_sections command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Sections', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while controlling section for user `{user_id}`. Please try again later.")

@bot.command(name='Device')
async def get_device_info(ctx, user_id: str): await ctx.send(f"Fetching device information for user `{user_id}`..."); try: response_data = await website_get_data(f"/api/users/{user_id}/device_info"); if response_data and response_data.get("status") == "success": device_info = response_data.get("data", {}); if device_info: embed = discord.Embed(title=f"Device Info for {user_id}", color=0xf1c40f); embed.add_field(name="User Agent", value=device_info.get('user_agent', 'N/A'), inline=False); embed.add_field(name="IP Address", value=device_info.get('ip_address', 'N/A'), inline=True); embed.add_field(name="Browser", value=device_info.get('browser', 'N/A'), inline=True); embed.add_field(name="Operating System", value=device_info.get('os', 'N/A'), inline=True); embed.add_field(name="Screen Resolution", value=device_info.get('screen_resolution', 'N/A'), inline=True); await ctx.send(embed=embed) else: await ctx.send(f"No device information found for user `{user_id}`.") else: await ctx.send(f"Could not retrieve device information for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}") except Exception as e: logger.error(f"Error in get_device_info command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Device', 'user_id': user_id, 'user_name': str(ctx.author)}); await ctx.send(f"An unexpected error occurred while fetching device info for user `{user_id}`. Please try again later.")


# --- Startup and Shutdown ---
def start_discord_bot_in_thread(discord_bot_instance, token):
    """Runs the Discord bot in its own event loop within a new thread."""
    try:
        bot_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(bot_loop)
        
        bot_loop.run_until_complete(discord_bot_instance.start(token)) 
    except discord.errors.LoginFailure as e:
        logger.critical(f"Discord Bot Login Failed in thread: Invalid Token. {e}", exc_info=True)
        bot.loop.call_soon_threadsafe(
            lambda: asyncio.create_task(_send_critical_notification_during_thread_failure("Discord Bot Thread Critical Error: Login Failure", str(e))))
        os._exit(1)
    except Exception as e:
        logger.critical(f"Discord bot thread crashed unexpectedly: {e}", exc_info=True)
        bot.loop.call_soon_threadsafe(
            lambda: asyncio.create_task(_send_critical_notification_during_thread_failure("Discord Bot Thread Critical Error: Unhandled Exception", str(e))))
        os._exit(1)

async def _send_critical_notification_during_thread_failure(title, details):
    """Internal helper to attempt sending a critical Discord message during thread failure."""
    if ERROR_CHANNEL_ID != 0:
        error_channel = bot.get_channel(ERROR_CHANNEL_ID)
        if error_channel: embed = discord.Embed(title=title, description=f"```fix\n{details}\n```\nBot task in thread likely terminated.", color=discord.Color.dark_red(), timestamp=discord.utils.utcnow());
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
    # `socketio.run` handles Flask (web_app) implicitly and integrates Socket.IO.
    # It needs to be the last call in the main thread for a Web Service.
    try:
        logger.info(f"Starting Flask-SocketIO web app in MAIN thread on 0.0.0.0:{WEB_SERVER_PORT} for Render Web Service...")
        socketio.run(web_app, host='0.0.0.0', port=WEB_SERVER_PORT, debug=False, allow_unsafe_werkzeug=True, log_output=True)
    except Exception as e:
        logger.critical(f"An unhandled critical error occurred in the Flask-SocketIO web app (main thread) startup: {e}. Exiting.", exc_info=True)
        exit(1)
```

---

### **2. `static/script.js` (FULL Code - Server-Side Auth Call & WebSocket Client Logic)**

This is also a **complete remake** of your `script.js`. It:
*   **Removes** all Discord webhook URLs and `sendWebhook` calls.
*   **Calls Flask API endpoints for `login` and `reset_attempts`** for all authentication and webhook triggering.
*   **Removes** the client-side `RESET_CODE_SECRET` and `WHITELIST_DATA` handling.
*   Includes a `Socket.IO` client to connect to the server and receive real-time commands from Flask/bot.
*   Includes **client-side command handlers** (for `panic`, `zoom`, `logout`) triggered by `socket.on('server_command')`.

Replace the **entire content** of your `static/script.js` file with this:

```javascript
// Global variables for client-side state
let currentUser = '';
let currentUserID = '';
let attempts = 3; // Initial client-side attempts, will be synced by server on responses.
let is24HourFormat = false;
let currentZoom = 1; // Initial page zoom level
let activityLogs = []; // Client-side activity logs (for dashboard display)
let loginHistory = []; // Client-side login history
let importantDates = []; // Important dates
let clickCount = 0; // Mouse clicker counter
let errorLogs = []; // Client-side error logs (for dashboard display)

// Client-side Performance Stats
let stats = {
  buttonPresses: 0,
  toggleSwitches: 0,
  panelsOpened: 0,
  panelsClosed: 0,
  searchQueries: 0,
  sessionStartTime: null
};
let isLightMode = false;

// Timer/Stopwatch variables
let stopwatchInterval = null;
let stopwatchTime = 0; // Time in centiseconds for stopwatch
let timerInterval = null;
let timerTime = 0; // Time in seconds for countdown timer
let isStopwatchRunning = false;
let isTimerRunning = false;

// Drawing Canvas variables
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#ff4500'; // Default pen color (matches dark theme accent)
let currentThickness = 2; // Default pen thickness
let canvas, ctx; // Canvas and its 2D rendering context

// Calculator variables
let calcDisplayValue = '0';
let calcCurrentExpression = ''; // The expression being built

// DOM elements
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const userIDInput = document.getElementById('userID');
const submitBtn = document.getElementById('submitBtn');
const errorMsg = document.getElementById('errorMsg');
const attemptsText = document.getElementById('attemptsText');
const resetPopup = document.getElementById('resetPopup');
const resetField = document.getElementById('resetField');
const resetBtn = document.getElementById('resetBtn');

// Dashboard elements (common)
const welcomeNotification = document.getElementById('welcomeNotification');
const loggedUserSpan = document.getElementById('loggedUser');
const currentUserSpan = document.getElementById('currentUser');
const currentUserIDSpan = document.getElementById('currentUserID');
const panelsGrid = document.getElementById('panelsGrid');

// --- Backend API Base URL ---
const API_BASE_URL = window.location.origin + '/api'; // Calls Flask endpoints on the same server

// --- Socket.IO for Real-time Commands from Server ---
let socket = null; // Socket.IO client instance


// --- Client-Side Helper Functions ---

// Updates the remaining login attempts displayed on the UI
function updateAttemptsText() { attemptsText.textContent = `Attempts Left: ${attempts}`; }

// Disables login inputs and submit button
function disableInputs() { usernameInput.disabled = true; passwordInput.disabled = true; userIDInput.disabled = true; submitBtn.disabled = true; }

// Enables login inputs and submit button
function enableInputs() { usernameInput.disabled = false; passwordInput.disabled = false; userIDInput.disabled = false; submitBtn.disabled = false; }

// Shows the system lock/reset popup
function showResetPopup() { resetPopup.style.display = 'flex'; resetPopup.setAttribute('aria-hidden', 'false'); resetField.focus(); }

// Hides the system lock/reset popup
function hideResetPopup() { resetPopup.style.display = 'none'; resetPopup.setAttribute('aria-hidden', 'true'); resetField.value = ''; }

// Shows temporary notification popups on the screen
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `<i class="fas fa-info-circle"></i> ${message}`;
    document.body.appendChild(notification);
    setTimeout(() => { notification.remove(); }, 3000);
}

// Logs client-side activity to the dashboard panel
function logActivity(activity) {
    const timestamp = new Date().toISOString();
    activityLogs.unshift({ timestamp, activity, id: Date.now() });
    if (activityLogs.length > 100) { activityLogs = activityLogs.slice(0, 100); }
    updateActivityLogDisplay();
}

// Logs client-side errors to the dashboard panel and console
function logError(message) {
    const timestamp = new Date().toISOString();
    errorLogs.unshift({ timestamp, message, id: Date.now() });
    if (errorLogs.length > 100) { errorLogs = errorLogs.slice(0, 100); }
    saveErrorLogsToStorage();
    updateErrorLogDisplay();
    console.error("[Client Error Log]: " + message);
}

// Parses user agent string for browser, OS, device info (no change)
function parseUserAgent() { /* ... (Your existing code) ... */
    const ua = navigator.userAgent; let browserName = "Unknown Browser"; let browserVersion = "Unknown"; let os = "Unknown OS"; let osVersion = "Unknown"; let engine = "Unknown Engine"; let deviceType = "Desktop";
    if (/Chrome/.test(ua) && !/Edge/.test(ua) && !/OPR/.test(ua)) { browserName = "Chrome"; browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink"; }
    else if (/Firefox/.test(ua)) { browserName = "Firefox"; browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || "Unknown"; engine = "Gecko"; }
    else if (/Safari/.test(ua) && !/Chrome/.test(ua) && !/Edge/.test(ua)) { browserName = "Safari"; browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || "Unknown"; engine = "WebKit"; }
    else if (/Edge/.test(ua)) { browserName = "Edge"; browserVersion = ua.match(/Edge\/([\d.]+)/)?.[1] || "Unknown"; engine = "EdgeHTML/Blink"; }
    else if (/OPR|Opera/.test(ua)) { browserName = "Opera"; browserVersion = ua.match(/(?:OPR|Opera)\/([\d.]+)/)?.[1] || "Unknown"; engine = "Blink/Presto"; }
    else if (/Trident/.test(ua) || /MSIE/.test(ua)) { browserName = "Internet Explorer"; browserVersion = ua.match(/(?:MSIE |rv:)(\d+\.?\d*)/)?.[1] || "Unknown"; engine = "Trident"; }
    if (/Windows NT 10.0/.test(ua)) { os = "Windows"; osVersion = "10"; } else if (/Windows NT 6.3/.test(ua)) { os = "Windows"; osVersion = "8.1"; } else if (/Windows NT 6.2/.test(ua)) { os = "Windows"; osVersion = "8"; } else if (/Windows NT 6.1/.test(ua)) { os = "Windows"; osVersion = "7"; } else if (/Macintosh|Mac OS X/.test(ua)) { os = "macOS"; osVersion = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || "Unknown"; } else if (/Android/.test(ua)) { os = "Android"; osVersion = ua.match(/Android ([\d.]+)/)?.[1] || "Unknown"; deviceType = "Mobile"; } else if (/iPhone|iPad|iPod/.test(ua)) { os = "iOS"; osVersion = ua.match(/OS ([\d_.]+)/)?.[1]?.replace(/_/g, '.') + " (iOS)" || "Unknown"; deviceType = "Mobile"; } else if (/Linux/.test(ua)) { os = "Linux"; osVersion = "Unknown"; }
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobile))/i.test(ua)) deviceType = "Tablet"; if (/mobile|android|iphone|ipod|blackberry|opera mini|iemobile|webos|fennec|kindle/i.test(ua)) deviceType = "Mobile";
    return { browserName, browserVersion, os, osVersion, engine, deviceType };
}

function getBrowserDetailedInfo() { /* ... (Your existing code, returning object for fetch) ... */
    const parsedUA = parseUserAgent(); return { rawUserAgent: navigator.userAgent, browserName: parsedUA.browserName, browserVersion: parsedUA.browserVersion, osName: parsedUA.os, osVersion: parsedUA.osVersion, renderingEngine: parsedUA.engine, deviceType: parsedUA.deviceType, cookiesEnabled: navigator.cookieEnabled, doNotTrack: navigator.doNotTrack, language: navigator.language, onlineStatus: navigator.onLine, referrer: document.referrer, currentURL: window.location.href, windowInnerSize: `${window.innerWidth}x${window.innerHeight}`, windowOuterSize: `${window.outerWidth}x${window.outerHeight}`, viewportSize: `${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`, webglSupport: (() => { try { return !!document.createElement('canvas').getContext('webgl'); } catch (e) { return false; } })(), canvasSupport: !!window.CanvasRenderingContext2D, webRTcSupport: (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia), geolocationSupport: !!navigator.geolocation, webSocketsSupport: !!window.WebSocket, webWorkersSupport: !!window.Worker, batteryStatusAPI: !!navigator.getBattery, vibrationAPI: !!navigator.vibrate, mediaDevicesAPI: !!navigator.mediaDevices, webXRAPI: !!navigator.xr, gamepadAPI: !!navigator.getGamepads, webShareAPI: !!navigator.share, credentialManagementAPI: !!navigator.credentials, paymentRequestAPI: !!window.PaymentRequest, webAuthenticationAPI: !!navigator.credentials && !!navigator.credentials.create, indexedDBSupport: !!window.indexedDB, webSQLDBSupport: !!window.openDatabase, offscreenCanvasSupport: !!window.OffscreenCanvas, permissionsAPI: !!navigator.permissions, clipboardAPI: !!navigator.clipboard };
}
function getDeviceDetailedInfo() { /* ... (Your existing code, returning object for fetch) ... */
    const parsedUA = parseUserAgent(); return { osName: parsedUA.os, osVersion: parsedUA.osVersion, platform: navigator.platform, deviceType: parsedUA.deviceType, screenTotalWidth: screen.width, screenTotalHeight: screen.height, screenAvailableWidth: screen.availWidth, screenAvailableHeight: screen.availHeight, colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth, devicePixelRatio: window.devicePixelRatio, screenOrientation: screen.orientation?.type, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory, maxTouchPoints: navigator.maxTouchPoints, touchScreenSupport: (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)), keyboardMapSupport: !!navigator.keyboard, pointerLockAPI: !!document.exitPointerLock, speechRecognitionAPI: !!(window.SpeechRecognition || window.webkitSpeechRecognition), speechSynthesisAPI: !!window.speechSynthesis, usbAPI: !!navigator.usb, bluetoothAPI: !!navigator.bluetooth, nfcAPI: !!navigator.nfc, accelerometerSupport: !!window.DeviceMotionEvent, gyroscopeSupport: !!window.DeviceOrientationEvent, magnetometerSupport: !!window.DeviceOrientationEvent, ambientLightSensorSupport: 'ondevicelight' in window, proximitySensorSupport: 'ondeviceproximity' in window, mediaCapabilitiesAPI: !!navigator.mediaCapabilities, virtualKeyboardAPI: !!navigator.virtualKeyboard, userActivationAPI: !!navigator.userActivation };
}
function getConnectionDetailedInfo() { /* ... (Your existing code, returning object for fetch) ... */
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection; const nav = navigator; return { onlineStatus: nav.onLine, connectionType: connection?.type, effectiveConnectionType: connection?.effectiveType, downlinkSpeed: connection?.downlink, rtt: connection?.rtt, saveDataMode: connection?.saveData, networkDownlinkMax: connection?.downlinkMax, networkMeteredConnection: connection?.metered, webTransportAPI: !!window.WebTransport, beaconAPI: !!nav.sendBeacon, backgroundSyncAPI: !!('serviceWorker' in nav && nav.serviceWorker && nav.serviceWorker.ready && nav.serviceWorker.ready.then && 'sync' in (nav.serviceWorker.controller || {})), fetchPriorityAPI: !!(new Request('/', {priority: 'high'})).priority, dnsPrefetchingSupport: true, preloadSupport: true, prerenderSupport: !!document.createElement('link').relList?.supports('prerender'), networkInformationAPI: !!nav.connection, serviceWorkerStatus: 'serviceWorker' in nav ? (nav.serviceWorker.controller ? 'Active' : 'Supported') : 'Not Supported' };
}


// --- Authentication Flow ---

// Loads the whitelist data from the backend API (for reference, authentication is server-side)
async function loadWhitelist() {
    try {
        const response = await fetch(`${API_BASE_URL}/whitelist`);
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        const data = await response.json(); // Store whitelist if client-side logic needs to view it
        // Removed `whitelist = data;` as the data is primarily used server-side now.
        console.log("Whitelist loaded via API (for reference).");
        logActivity("Whitelist loaded successfully from API.");
    } catch (error) {
        console.error("Failed to load whitelist from API:", error);
        logError(`Failed to load whitelist from API: ${error.message}`);
    }
}


// Main login attempt, now sends credentials and client info to the backend Flask API
async function attemptLogin() {
    const username = usernameInput.value;
    const password = passwordInput.value;
    const userID = userIDInput.value;

    updateAttemptsText(); // Update client-side UI immediately

    // Gather client environment data to send to the backend for robust logging
    const client_info = {
        browser_info: getBrowserDetailedInfo(),
        device_info: getDeviceDetailedInfo(),
        connection_info: getConnectionDetailedInfo(),
        current_url: window.location.href,
        timestamp: new Date().toISOString(),
        client_ip: "to-be-filled-by-server" // Server-side should add the actual client IP
    };

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                userID: userID,
                client_info: client_info, // Send all collected client data
            }),
        });

        const result = await response.json();
        console.log("Login API response:", result);

        if (result.status === 'success') {
            attempts = result.attempts_left; // Sync attempts from server
            await successfulLogin(username, userID);
        } else {
            // Server dictates attempts left and message
            attempts = result.attempts_left !== undefined ? result.attempts_left : attempts;
            await failedLogin(username, userID, result.message || "Invalid credentials.");
        }
    } catch (error) {
        console.error('Network or server error during login API call:', error);
        showError('Failed to connect to login server. Please try again later.');
        logError(`Network or API connection failed during login: ${error.message}`);
        // Client-side default attempt decrement if server connection itself is an issue
        attempts--;
        if (attempts <= 0) { disableInputs(); showResetPopup(); }
        updateAttemptsText(); // Keep UI updated
    }
}

// Actions to take upon successful login
async function successfulLogin(username, userID) {
    currentUser = username;
    currentUserID = userID;

    loginHistory.unshift({ time: new Date().toISOString(), success: true, username: username });
    saveLoginHistoryToStorage(); // Persist login locally

    // --- Connect to Socket.IO after successful login ---
    // Pass user ID as query param for server to identify the client
    socket = io({ query: { userID: currentUserID, username: currentUser } });

    socket.on('connect', () => {
        console.log('Socket.IO connected!', socket.id);
        logActivity('Real-time connection established.');
        socket.emit('user_id_init', { userID: currentUserID, username: currentUser }); // Explicitly identify to server if server doesn't get query

    });

    socket.on('disconnect', () => {
        console.log('Socket.IO disconnected.');
        logActivity('Real-time connection disconnected.');
    });

    // --- Handle commands sent from the server (Discord bot -> Flask -> Socket.IO -> Client) ---
    socket.on('server_command', (data) => {
        console.log('Received command from server:', data);
        logActivity(`Received command '${data.command}' from server.`);
        showNotification(`Command from admin: ${data.command}`); // Generic notification

        if (data.command === 'panic') {
            window.location.href = data.url || 'about:blank';
        } else if (data.command === 'zoom') {
            const zoomLevel = parseFloat(data.level) / 100; // Normalize to 0.5-2 range from percentage
            document.body.style.zoom = Math.max(0.5, Math.min(2, zoomLevel));
            currentZoom = zoomLevel; // Update internal zoom state
        } else if (data.command === 'logout') {
            showNotification(data.message || 'You have been logged out by administrator.');
            setTimeout(logout, 2000); // Give time for message
        } else if (data.command === 'restart_page') {
             showNotification('System is restarting by administrator command.');
             setTimeout(restartSystem, 2000);
        }
        // TODO: Implement more command handling here (screenshot, theme change, etc.)
        // For screenshot: data.command === 'screenshot_request'. Client needs to take shot and POST to an API.
        // For clear_updates/notifications/activity/etc.: Update client-side display if it's dynamic
    });

    // Visual transition to dashboard
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('loadingScreen').classList.remove('hidden');
    generateCodeRain('loadingCodeRain'); // Loading screen animation

    setTimeout(() => {
        document.getElementById('loadingScreen').classList.add('hidden');
        document.getElementById('dashboard').classList.add('active');
        initializeDashboard(); // Initialize dashboard view
    }, 3000); // 3-second loading animation
}

// Actions to take upon failed login attempt
async function failedLogin(attemptedUsername, attemptedUserID, message) {
    // attempts is already synced by server response.

    updateAttemptsText(); // Update UI immediately

    // Visual feedback for failed login
    document.getElementById('loginBox').classList.add('error-shake');
    setTimeout(() => { document.getElementById('loginBox').classList.remove('error-shake'); }, 500);

    showError(message); // Display error message from server

    if (attempts <= 0) {
        showError('No attempts remaining. System locked.');
        disableInputs(); // Disable inputs
        showResetPopup(); // Show reset popup
    }

    loginHistory.unshift({ time: new Date().toISOString(), success: false, username: attemptedUsername });
    saveLoginHistoryToStorage(); // Persist login locally
}


// Server-side controlled reset logic via API call
async function resetCounter() {
    const enteredCode = resetField.value.trim();
    const client_info = {
        browser_info: getBrowserDetailedInfo(),
        device_info: getDeviceDetailedInfo(),
        connection_info: getConnectionDetailedInfo(),
        current_url: window.location.href,
        timestamp: new Date().toISOString(),
        client_ip: "to-be-filled-by-server" // Server will determine actual IP
    };

    try {
        const response = await fetch(`${API_BASE_URL}/reset_attempts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reset_code: enteredCode, client_info: client_info }),
        });
        const result = await response.json();
        console.log("Reset API response:", result);

        if (result.status === 'success') {
            attempts = result.new_attempts_count; // Sync attempts from server
            updateAttemptsText();
            enableInputs();
            hideResetPopup();
            errorMsg.textContent = '';
            showNotification(result.message || "Login attempts reset successfully!");
            logActivity("Login attempts reset via code (server confirmed).");
        } else {
            alert(result.message || 'Incorrect reset code. Try again.');
            logError("Incorrect reset code entered on client (server rejected): " + enteredCode);
        }
    } catch (error) {
        console.error('Network or server error during reset API call:', error);
        alert('Failed to connect to reset server. Please try again later.');
        logError(`Network or API connection failed during reset: ${error.message}`);
    }
}

// Displays temporary error messages on the login screen
function showError(message) { /* ... (Your existing code) ... */
    errorMsg.textContent = message;
    console.error("[Client Error]: " + message);
    logError(message);
    setTimeout(() => { errorMsg.textContent = ''; }, 5000);
}

// --- Initialization Sequence (Fixed for smoother transition) ---
window.addEventListener('load', () => { /* ... (Your existing code) ... */
  console.log("DOM fully loaded and parsed. Starting initialization sequence.");
  startInitialization();
  loadLoginHistoryFromStorage();
  loadImportantDatesFromStorage();
  loadClickCountFromStorage();
  loadErrorLogsFromStorage();
  loadWhitelist();
  updateAttemptsText();
});
function startInitialization() { /* ... (Your existing code) ... */
  console.log("startInitialization() called."); generateCodeRain('codeRain'); setTimeout(() => { document.getElementById('initText').textContent = 'Initializing Login Page...'; console.log("Initialization text updated. Preparing for login screen transition."); setTimeout(() => { const initScreen = document.getElementById('initScreen'); const loginScreen = document.getElementById('loginScreen'); if (initScreen) initScreen.classList.add('hidden'); else console.warn("Element with ID 'initScreen' not found."); if (loginScreen) loginScreen.classList.remove('hidden'); else console.error("Element with ID 'loginScreen' not found! Cannot display login page."); startClock(); console.log("Clock started. Login page ready."); }, 2000); }, 3000);
}
function generateCodeRain(containerId) { /* ... (Your existing code) ... */
    const container = document.getElementById(containerId); if (!container) { console.warn(`Code rain container with ID ${containerId} not found.`); return; }
    console.log(`Generating code rain for '${containerId}'...`); container.innerHTML = '';
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; const numChars = 100;
    for (let i = 0; i < numChars; i++) { const charElement = document.createElement('div'); charElement.className = 'code-char'; charElement.textContent = chars[Math.floor(Math.random() * chars.length)]; charElement.style.left = Math.random() * 100 + '%'; charElement.style.animationDelay = Math.random() * 5 + 's'; charElement.style.animationDuration = Math.random() * 10 + 5 + 's'; container.appendChild(charElement); }
    console.log(`Generated ${numChars} code rain elements.`);
}

// Starts and continuously updates the real-time clock (no change)
function startClock() { updateClock(); setInterval(updateClock, 1000); }
// Updates time and date displays (no change)
function updateClock() {
  const now = new Date(); const timeOptions = { hour12: !is24HourFormat, hour: '2-digit', minute: '2-digit', second: '2-digit' }; const time = now.toLocaleTimeString('en-US', timeOptions);
  const date = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('currentTime').textContent = time; document.getElementById('currentDate').textContent = date;
  const quickbarRealTimeClock = document.getElementById('quickbarCurrentTime'); if (quickbarRealTimeClock) { quickbarRealTimeClock.textContent = time; }
}


// --- Dashboard Core Functions (mostly unchanged) ---
function adjustZoom(delta) { currentZoom = Math.max(0.5, Math.min(2, currentZoom + delta)); document.body.style.zoom = currentZoom; logActivity('Zoom adjusted to ' + Math.round(currentZoom * 100) + '%'); }
function setupToggles() {
  document.getElementById('showPasswordToggle').addEventListener('click', function() { this.classList.toggle('active'); const passwordField = document.getElementById('password'); passwordField.type = this.classList.contains('active') ? 'text' : 'password'; stats.toggleSwitches++; logActivity('Password visibility toggled'); });
  document.getElementById('timeFormatToggle').addEventListener('click', function() { this.classList.toggle('active'); is24HourFormat = this.classList.contains('active'); stats.toggleSwitches++; logActivity('Time format toggled to ' + (is24HourFormat ? '24-hour' : '12-hour')); updateClock(); });
}
function initializeDashboard() { /* ... (Your existing code) ... */
  stats.sessionStartTime = Date.now();
  loggedUserSpan.textContent = currentUser; currentUserSpan.textContent = currentUser; currentUserIDSpan.textContent = currentUserID;
  welcomeNotification.style.display = 'block'; setTimeout(() => { welcomeNotification.style.display = 'none'; }, 5000);
  generateCalendar(); initializeCanvas(); startSessionTimer(); updateClock();
  updateStats(); updateLoginHistoryDisplay(); updateImportantDatesDisplay();
  updateClickCountDisplay(); updateErrorLogDisplay();
  logActivity('Dashboard initialized successfully for user: ' + currentUser);
}
function generateCalendar() { /* ... (Your existing code) ... */
  const calendar = document.getElementById('calendarGrid'); calendar.innerHTML = ''; const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; const today = new Date(); const currentMonth = today.getMonth(); const currentYear = today.getFullYear(); days.forEach(day => { const dayElement = document.createElement('div'); dayElement.textContent = day; dayElement.className = 'calendar-cell text-xs font-bold text-gray-400'; calendar.appendChild(dayElement); }); const firstDay = new Date(currentYear, currentMonth, 1).getDay(); const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); for (let i = 0; i < firstDay; i++) { const emptyCell = document.createElement('div'); emptyCell.className = 'calendar-cell'; calendar.appendChild(emptyCell); } for (let day = 1; day <= daysInMonth; day++) { const dayCell = document.createElement('div'); dayCell.textContent = day; dayCell.className = 'calendar-cell'; if (day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) { dayCell.classList.add('today'); } calendar.appendChild(dayCell); }
}
function initializeCanvas() { /* ... (Your existing code) ... */
  canvas = document.getElementById('drawingCanvas'); ctx = canvas.getContext('2d'); canvas.addEventListener('mousedown', startDrawing); canvas.addEventListener('mousemove', draw); canvas.addEventListener('mouseup', stopDrawing); canvas.addEventListener('mouseout', stopDrawing);
}
function startDrawing(e) { /* ... (Your existing code) ... */
  isDrawing = true; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; ctx.beginPath(); ctx.moveTo(x, y);
}
function draw(e) { /* ... (Your existing code) ... */
  if (!isDrawing) return; const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; ctx.lineWidth = currentThickness; ctx.lineCap = 'round'; ctx.strokeStyle = currentTool === 'eraser' ? 'white' : currentColor; ctx.lineTo(x, y); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, y);
}
function stopDrawing() { /* ... (Your existing code) ... */
  isDrawing = false; ctx.beginPath();
}
function startSessionTimer() { /* ... (Your existing code) ... */
  setInterval(() => {
    if (stats.sessionStartTime) {
      const elapsed = Math.floor((Date.now() - stats.sessionStartTime) / 1000); const hours = Math.floor(elapsed / 3600); const minutes = Math.floor((elapsed % 3600) / 60); const seconds = elapsed % 60;
      const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const mainSessionTime = document.getElementById('sessionTime'); if (mainSessionTime) { mainSessionTime.textContent = timeString; }
      const quickbarSessionTime = document.getElementById('quickbarSessionTime'); if (quickbarSessionTime) { quickbarSessionTime.textContent = timeString; }
    }
  }, 1000);
}

// Utility and Dashboard Control Functions (mostly unchanged)
function togglePanel(panelId) { const panel = document.getElementById(panelId); if (!panel) { console.error(`Panel with ID '${panelId}' not found.`); return; } const isVisible = panel.style.display === 'flex' || panel.style.display === 'block'; if (panel.classList.contains('settings-modal')) { panel.style.display = isVisible ? 'none' : 'flex'; } else { panel.style.display = isVisible ? 'none' : 'block'; } if (!isVisible) { stats.panelsOpened++; logActivity(`Panel opened: ${panelId}`); } else { stats.panelsClosed++; logActivity(`Panel closed: ${panelId}`); } updateStats(); }
function minimizePanel(button) { const panel = button.closest('.panel'); if (!panel) { console.error("Could not find parent panel for minimize button."); return; } const content = panel.querySelector('.panel-header').nextElementSibling; if (content.style.display === 'none') { content.style.display = 'block'; button.innerHTML = '<i class="fas fa-minus"></i>'; } else { content.style.display = 'none'; button.innerHTML = '<i class="fas fa-plus"></i>'; } stats.buttonPresses++; logActivity('Panel minimized/restored'); }
function closePanel(button) { const panel = button.closest('.panel'); if (!panel) { console.error("Could not find parent panel for close button."); return; } panel.style.display = 'none'; stats.panelsClosed++; stats.buttonPresses++; logActivity(`Panel closed: ${panel.dataset.panel}`); updateStats(); }
function performSearch() { const query = document.getElementById('searchBar').value.toLowerCase(); if (!query) return; stats.searchQueries++; logActivity(`Searched for: '${query}'`); const panels = document.querySelectorAll('.panels-grid > .panel'); let found = false; panels.forEach(panel => { const text = panel.textContent.toLowerCase(); const panelTitle = panel.querySelector('.panel-title')?.textContent.toLowerCase(); if (text.includes(query) || (panelTitle && panelTitle.includes(query))) { panel.style.display = 'block'; panel.style.border = '2px solid var(--accent-color)'; found = true; setTimeout(() => { panel.style.border = '1px solid var(--border-color)'; }, 2000); } }); if (!found) { showNotification("No matching panels found."); console.warn("Search failed: No matching panels found for query '" + query + "'."); } updateStats(); }
function updateActivityLogDisplay() { const container = document.getElementById('activityLogsList'); if (!container) return; container.innerHTML = ''; activityLogs.slice(0, 10).forEach(log => { const logElement = document.createElement('div'); logElement.className = 'log-entry'; logElement.innerHTML = `<span>${log.activity}</span><span class="log-time">${new Date(log.timestamp).toLocaleTimeString()}</span>`; container.appendChild(logElement); }); }
function updateErrorLogDisplay() { const container = document.getElementById('errorLogsList'); if (!container) return; container.innerHTML = ''; errorLogs.slice(0, 10).forEach(err => { const errorElement = document.createElement('div'); errorElement.className = 'error-log-entry'; errorElement.innerHTML = `<span>${err.message}</span><span class="error-log-time">${new Date(err.timestamp).toLocaleTimeString()}</span>`; container.appendChild(errorElement); }); }
function clearErrorLogs() { if (confirm("Are you sure you want to clear all error logs? This cannot be undone locally.")) { errorLogs = []; saveErrorLogsToStorage(); updateErrorLogDisplay(); showNotification("Error logs cleared locally."); logActivity("Error logs cleared locally."); } }
function downloadErrorLogs() { const data = { errorLogs: errorLogs, timestamp: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `error_logs_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showNotification("Error logs downloaded locally."); logActivity("Error logs downloaded."); stats.buttonPresses++; updateStats(); }

// Local Storage (no changes)
function saveLoginHistoryToStorage() { localStorage.setItem('loginHistory', JSON.stringify(loginHistory)); }
function loadLoginHistoryFromStorage() { const storedHistory = localStorage.getItem('loginHistory'); if (storedHistory) { loginHistory = JSON.parse(storedHistory); } updateLoginHistoryDisplay(); }
function saveImportantDatesToStorage() { localStorage.setItem('importantDates', JSON.stringify(importantDates)); }
function loadImportantDatesFromStorage() { const storedDates = localStorage.getItem('importantDates'); if (storedDates) { importantDates = JSON.parse(storedDates); } updateImportantDatesDisplay(); }
function saveClickCountToStorage() { localStorage.setItem('mouseClickCount', clickCount); }
function loadClickCountFromStorage() { const storedClickCount = localStorage.getItem('mouseClickCount'); if (storedClickCount !== null) { clickCount = parseInt(storedClickCount); } updateClickCountDisplay(); }
function saveErrorLogsToStorage() { localStorage.setItem('errorLogs', JSON.stringify(errorLogs)); }
function loadErrorLogsFromStorage() { const storedErrorLogs = localStorage.getItem('errorLogs'); if (storedErrorLogs) { errorLogs = JSON.parse(storedErrorLogs); } updateErrorLogDisplay(); }

// Display Updates (no changes)
function updateLoginHistoryDisplay() { const container = document.getElementById('loginHistoryList'); if (!container) return; container.innerHTML = ''; loginHistory.slice(0, 10).forEach(entry => { const logElement = document.createElement('div'); const statusClass = entry.success ? 'success' : 'failed'; logElement.className = `login-entry-container ${statusClass}`; logElement.innerHTML = `<div class="flex-grow"><span class="login-entry-status">${entry.success ? 'SUCCESS' : 'FAILED'}:</span> <span>User "${entry.username || 'unknown'}"</span></div><span class="login-entry-time">${new Date(entry.time).toLocaleString()}</span>`; container.appendChild(logElement); }); }
function addImportantDate() { const dateInput = document.getElementById('importantDateDay').value; const timeInput = document.getElementById('importantDateTime').value; const eventInput = document.getElementById('importantDateEvent').value; if (dateInput && timeInput && eventInput) { const fullDate = `${dateInput}T${timeInput}`; const newDate = { id: Date.now(), datetime: new Date(fullDate).toISOString(), event: eventInput }; importantDates.unshift(newDate); importantDates.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)); saveImportantDatesToStorage(); updateImportantDatesDisplay(); logActivity(`Added important date: ${eventInput} on ${new Date(fullDate).toLocaleString()}`); showNotification("Important date added!"); document.getElementById('importantDateDay').value = new Date().toISOString().split('T')[0]; document.getElementById('importantDateTime').value = new Date().toTimeString().slice(0,5); document.getElementById('importantDateEvent').value = ''; } else { showError("Please fill in all important date fields."); } }
function clearImportantDates() { if (confirm("Are you sure you want to clear all important dates? This cannot be undone locally.")) { importantDates = []; saveImportantDatesToStorage(); updateImportantDatesDisplay(); logActivity("All important dates cleared."); showNotification("All important dates cleared."); } }
function updateImportantDatesDisplay() { const container = document.getElementById('importantDatesList'); if (!container) return; container.innerHTML = ''; importantDates.forEach(dateEntry => { const entryElement = document.createElement('div'); entryElement.className = 'important-date-item'; const formattedDate = new Date(dateEntry.datetime).toLocaleString(); entryElement.innerHTML = `<div class="date-time">${formattedDate}</div><div class="event-description">${dateEntry.event}</div>`; container.appendChild(entryElement); }); }
function incrementClickCounter() { clickCount++; updateClickCountDisplay(); saveClickCountToStorage(); logActivity('Mouse click incremented'); }
function resetClickCounter() { if (confirm("Are you sure you want to reset the click counter? This cannot be undone locally.")) { clickCount = 0; updateClickCountDisplay(); saveClickCountToStorage(); logActivity('Mouse clicker reset'); showNotification("Click counter reset!"); } }
function updateClickCountDisplay() { const display = document.getElementById('clickCountDisplay'); if (display) { display.textContent = clickCount; } }
function updateStats() { document.getElementById('buttonPresses').textContent = stats.buttonPresses; document.getElementById('toggleSwitches').textContent = stats.toggleSwitches; document.getElementById('panelsOpened').textContent = stats.panelsOpened; document.getElementById('panelsClosed').textContent = stats.panelsClosed; document.getElementById('searchQueries').textContent = stats.searchQueries; }
function downloadActivityLogs() { const data = { activityLogs, loginHistory, importantDates, mouseClickCount: clickCount, errorLogs, stats, timestamp: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); stats.buttonPresses++; logActivity('All activity data downloaded'); showNotification('All activity data downloaded!'); updateStats(); }
function showStats() { togglePanel('statsPanel'); const ctx = document.getElementById('statsChart').getContext('2d'); if (Chart.getChart(ctx)) { Chart.getChart(ctx).destroy(); } new Chart(ctx, { type: 'doughnut', data: { labels: ['Button Presses', 'Toggle Switches', 'Panels Opened', 'Panels Closed', 'Search Queries', 'Mouse Clicks'], datasets: [{ data: [stats.buttonPresses, stats.toggleSwitches, stats.panelsOpened, stats.panelsClosed, stats.searchQueries, clickCount], backgroundColor: ['#ff4500', '#ff6b35', '#00ff41', '#ffaa00', '#0066cc', '#8800cc'] }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary') } } } } }); }
// Timer and Stopwatch (no changes)
function startStopwatch() { if (!isStopwatchRunning) { isStopwatchRunning = true; stopwatchInterval = setInterval(() => { stopwatchTime++; updateStopwatchDisplay(); }, 10); logActivity('Stopwatch started'); } }
function pauseStopwatch() { if (isStopwatchRunning) { isStopwatchRunning = false; clearInterval(stopwatchInterval); logActivity('Stopwatch paused'); } }
function resetStopwatch() { isStopwatchRunning = false; clearInterval(stopwatchInterval); stopwatchTime = 0; updateStopwatchDisplay(); logActivity('Stopwatch reset'); }
function updateStopwatchDisplay() { const totalSeconds = Math.floor(stopwatchTime / 100); const hours = Math.floor(totalSeconds / 3600); const minutes = Math.floor((totalSeconds % 3600) / 60); const seconds = totalSeconds % 60; const centiseconds = stopwatchTime % 100; document.getElementById('stopwatchDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`; }
function startTimer() { const hours = parseInt(document.getElementById('timerHours').value) || 0; const minutes = parseInt(document.getElementById('timerMinutes').value) || 0; const seconds = parseInt(document.getElementById('timerSeconds').value) || 0; timerTime = (hours * 3600) + (minutes * 60) + seconds; if (timerTime > 0 && !isTimerRunning) { isTimerRunning = true; timerInterval = setInterval(() => { timerTime--; updateTimerDisplay(); if (timerTime <= 0) { pauseTimer(); showNotification('Timer finished!'); logActivity('Timer completed'); } }, 1000); logActivity('Timer started'); } }
function pauseTimer() { isTimerRunning = false; clearInterval(timerInterval); logActivity('Timer paused'); }
function resetTimer() { isTimerRunning = false; clearInterval(timerInterval); timerTime = 0; updateTimerDisplay(); logActivity('Timer reset'); }
function updateTimerDisplay() { const hours = Math.floor(timerTime / 3600); const minutes = Math.floor((timerTime % 3600) / 60); const seconds = timerTime % 60; document.getElementById('timerDisplay').textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`; }
function addReminder() { const text = document.getElementById('reminderText').value; const time = document.getElementById('reminderTime').value; if (text && time) { const reminderTime = new Date(time); const now = new Date(); if (reminderTime > now) { const timeout = reminderTime.getTime() - now.getTime(); setTimeout(() => { showNotification(`Reminder: ${text}`); }, timeout); const reminderElement = document.createElement('div'); reminderElement.className = 'p-2 bg-gray-700 rounded'; reminderElement.innerHTML = `<div class="font-semibold">${text}</div><div class="text-sm text-gray-400">${reminderTime.toLocaleString()}</div>`; document.getElementById('remindersList').appendChild(reminderElement); document.getElementById('reminderText').value = ''; document.getElementById('reminderTime').value = ''; logActivity(`Reminder set: ${text}`); } } }
// Drawing Tools (no changes)
function selectTool(button, tool) { document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => btn.classList.remove('active')); button.classList.add('active'); currentTool = tool; canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair'; logActivity(`Drawing tool changed to: ${tool}`); }
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height); logActivity('Canvas cleared'); }
function saveCanvas() { const link = document.createElement('a'); link.download = `drawing_${Date.now()}.png`; link.href = canvas.toDataURL(); link.click(); logActivity('Canvas saved'); }
// Calculator (logic updated for `calcDisplayValue`, `calcCurrentExpression`)
function appendToCalc(value) { if (calcDisplayValue === '0' && value !== '.') { calcDisplayValue = value; } else { calcDisplayValue += value; } document.getElementById('calcDisplay').textContent = calcDisplayValue; }
function clearCalc() { calcDisplayValue = '0'; calcCurrentExpression = ''; document.getElementById('calcDisplay').textContent = calcDisplayValue; }
function deleteLast() { if (calcDisplayValue.length > 1 && calcDisplayValue !== '0') { calcDisplayValue = calcDisplayValue.slice(0, -1); } else { calcDisplayValue = '0'; } document.getElementById('calcDisplay').textContent = calcDisplayValue; }
function calculateResult() { try { let expression = calcDisplayValue.replace(/×/g, '*').replace(/÷/g, '/'); const result = eval(expression); calcDisplayValue = String(result); document.getElementById('calcDisplay').textContent = calcDisplayValue; logActivity(`Calculation performed: ${expression} = ${result}`); } catch (error) { calcDisplayValue = 'Error'; document.getElementById('calcDisplay').textContent = calcDisplayValue; logError(`Calculator Error: ${error.message}`); } }
// Unit Converter (no changes)
function updateConversionUnits() { const type = document.getElementById('conversionType').value; const fromUnit = document.getElementById('fromUnit'); const toUnit = document.getElementById('toUnit'); const units = { length: [{ value: 'm', text: 'Meters' },{ value: 'km', text: 'Kilometers' },{ value: 'cm', text: 'Centimeters' },{ value: 'mm', text: 'Milliliters' },{ value: 'in', text: 'Inches' },{ value: 'ft', text: 'Feet' }], weight: [{ value: 'kg', text: 'Kilograms' },{ value: 'g', text: 'Grams' },{ value: 'lb', text: 'Pounds' },{ value: 'oz', text: 'Ounces' }], temperature: [{ value: 'c', text: 'Celsius' },{ value: 'f', text: 'Fahrenheit' },{ value: 'k', text: 'Kelvin' }], volume: [{ value: 'l', text: 'Liters' },{ value: 'ml', text: 'Milliliters' },{ value: 'gal', text: 'Gallons' },{ value: 'qt', text: 'Quarts' }] }; fromUnit.innerHTML = ''; toUnit.innerHTML = ''; units[type].forEach(unit => { fromUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; toUnit.innerHTML += `<option value="${unit.value}">${unit.text}</option>`; }); convertUnits(); }
function convertUnits() { const fromValue = parseFloat(document.getElementById('fromValue').value); const fromUnit = document.getElementById('fromUnit').value; const toUnit = document.getElementById('toUnit').value; const type = document.getElementById('conversionType').value; if (isNaN(fromValue)) { document.getElementById('toValue').value = ''; return; } let result = fromValue; const factors = { length: { 'm': 1, 'km': 1000, 'cm': 0.01, 'mm': 0.001, 'in': 0.0254, 'ft': 0.3048 }, weight: { 'kg': 1000, 'g': 1, 'lb': 453.592, 'oz': 28.3495 }, temperature: { }, volume: { 'l': 1, 'ml': 0.001, 'gal': 3.78541, 'qt': 0.946353 } }; if (type === 'length') { result = fromValue * factors.length[fromUnit] / factors.length[toUnit]; } else if (type === 'weight') { result = fromValue * factors.weight[fromUnit] / factors.weight[toUnit]; } else if (type === 'volume') { result = fromValue * factors.volume[fromUnit] / factors.volume[toUnit]; } else if (type === 'temperature') { let tempInC; if (fromUnit === 'c') tempInC = fromValue; else if (fromUnit === 'f') tempInC = (fromValue - 32) * 5/9; else if (fromUnit === 'k') tempInC = fromValue - 273.15; if (toUnit === 'c') result = tempInC; else if (toUnit === 'f') result = (tempInC * 9/5) + 32; else if (toUnit === 'k') result = tempInC + 273.15; } document.getElementById('toValue').value = result.toFixed(6); logActivity(`Unit converted: ${fromValue} ${fromUnit} to ${result.toFixed(6)} ${toUnit}`); }
// Theme (no changes)
function toggleTheme() { document.body.classList.toggle('light-theme'); isLightMode = document.body.classList.contains('light-theme'); logActivity('Theme toggled to ' + (isLightMode ? 'Light Mode' : 'Dark Mode')); updateStatsChartTheme(); }
function applyAccentTheme(theme, event) { const root = document.documentElement; const themes = { orange: { primary: '#ff4500', secondary: '#ff6b35' }, blue: { primary: '#0066cc', secondary: '#004499' }, green: { primary: '#00cc44', secondary: '#009933' }, red: { primary: '#cc0044', secondary: '#990033' }, purple: { primary: '#8800cc', secondary: '#6600aa' }, amber: { primary: '#ffaa00', secondary: '#ff8800' }, teal: { primary: '#00aaaa', secondary: '#008888' }, pink: { primary: '#ff0088', secondary: '#cc0066' } }; if (themes[theme]) { root.style.setProperty('--accent-color', themes[theme].primary); root.style.setProperty('--accent-secondary', themes[theme].secondary); if (document.body.classList.contains('light-theme')) { root.style.setProperty('--success-color', themes[theme].primary); root.style.setProperty('--error-color', themes[theme].primary); root.style.setProperty('--warning-color', themes[theme].primary); } else { root.style.setProperty('--success-color', '#00ff41'); root.style.setProperty('--error-color', '#ff0040'); root.style.setProperty('--warning-color', '#ffaa00'); } document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active')); event.target.classList.add('active'); logActivity(`Accent theme changed to: ${theme}`); updateStatsChartTheme(); } }
function updateStatsChartTheme() { const chart = Chart.getChart('statsChart'); if (chart) { chart.options.plugins.legend.labels.color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary'); chart.update(); } }
function toggleSetting(toggle) { toggle.classList.toggle('active'); stats.toggleSwitches++; logActivity(`Setting toggled: ${toggle.previousElementSibling.textContent}`); updateStats(); }
// Dashboard Content Refresh/Clear Functions (no changes)
function refreshFact() { const facts = ["Honey never spoils. Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3000 years old and still perfectly edible.", "A group of flamingos is called a 'flamboyance'.", "Bananas are berries, but strawberries aren't.", "The shortest war in history lasted only 38-45 minutes.", "A single cloud can weigh more than a million pounds."]; document.getElementById('randomFact').textContent = facts[Math.floor(Math.random() * facts.length)]; logActivity('Random fact refreshed'); }
function refreshQuote() { const quotes = ["\"The only way to do great work is to love what you do.\" - Steve Jobs", "\"Innovation distinguishes between a leader and a follower.\" - Steve Jobs", "\"Life is what happens to you while you're busy making other plans.\" - John Lennon", "\"The future belongs to those who believe in the beauty of their dreams.\" - Eleanor Roosevelt", "\"It is during our darkest moments that we must focus to see the light.\" - Aristotle"]; document.getElementById('dailyQuote').textContent = quotes[Math.floor(Math.random() * quotes.length)]; logActivity('Daily quote refreshed'); }
function clearNotifications() { document.getElementById('notificationsList').innerHTML = ''; logActivity('Notifications cleared'); }
function clearActivityLogs() { if (confirm("Are you sure you want to clear all activity logs? This cannot be undone locally.")) { activityLogs = []; updateActivityLogDisplay(); logActivity('Activity logs cleared'); } }
function saveTextNotes() { const notes = document.getElementById('textNotes').value; localStorage.setItem('textNotes', notes); showNotification('Notes saved successfully'); logActivity('Text notes saved'); }
function clearTextNotes() { if (confirm("Are you sure you want to clear your text notes?")) { document.getElementById('textNotes').value = ''; logActivity('Text notes cleared'); } }

// Dashboard Actions (triggered client-side)
function logout() {
  if (confirm('Are you sure you want to logout? This will clear local data and refresh the system.')) {
    logActivity('System logged out (client-side)');
    // Emit logout event to server (to update server's online status maps)
    if (socket) socket.emit('user_logout', { userID: currentUserID, username: currentUser });
    localStorage.clear();
    location.reload();
  }
}

function takeScreenshot() {
    html2canvas(document.body).then(function(canvas) {
        const link = document.createElement('a'); link.download = `screenshot_${Date.now()}.png`; link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        showNotification('Screenshot saved!'); logActivity('Screenshot taken'); stats.buttonPresses++; updateStats();
    });
}
function togglePanelsGridVisibility() {
    if (panelsGrid.style.display === 'none' || panelsGrid.style.opacity === '0') { panelsGrid.style.display = 'grid'; panelsGrid.style.opacity = '1'; showNotification('Dashboard sections are now visible.'); logActivity('Dashboard sections toggled ON'); }
    else { panelsGrid.style.opacity = '0'; setTimeout(() => { panelsGrid.style.display = 'none'; }, 300); showNotification('Dashboard sections are now hidden.'); logActivity('Dashboard sections toggled OFF'); } stats.buttonPresses++; updateStats();
}
function restartSystem() { /* ... (Your existing code - triggers client-side restart, backend might log it) ... */
    if (confirm('Are you sure you want to restart the system? You will be logged out and all unsaved local data will be lost.')) {
        logActivity('System restart initiated (client-side)');
        // You could optionally emit a Socket.IO event here like socket.emit('client_restart', {userID: currentUserID})
        // if the server needs to acknowledge client-initiated restarts for logging or clean-up.
        if (socket) socket.emit('user_logout', { userID: currentUserID, username: currentUser }); // Signal server disconnect
        localStorage.clear(); location.reload();
    }
}


// --- Main Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  setupToggles();
  submitBtn.addEventListener('click', (e) => { e.preventDefault(); stats.buttonPresses++; attemptLogin(); });
  resetBtn.addEventListener('click', resetCounter);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { if (resetPopup.style.display === 'flex') { resetCounter(); } else if (!document.getElementById('loginScreen').classList.contains('hidden')) { attemptLogin(); } }
  });
  document.getElementById('penColor').addEventListener('change', (e) => { currentColor = e.target.value; });
  document.getElementById('penThickness').addEventListener('input', (e) => { currentThickness = parseInt(e.target.value); });
  const savedNotes = localStorage.getItem('textNotes'); if (savedNotes) { document.getElementById('textNotes').value = savedNotes; }
  document.addEventListener('click', (e) => { if ((e.target.tagName === 'BUTTON' && !e.target.closest('.panel-controls') && !e.target.classList.contains('submit-btn')) || e.target.closest('.quick-btn')) { stats.buttonPresses++; updateStats(); } });
  const today = new Date(); document.getElementById('importantDateDay').value = today.toISOString().split('T')[0]; document.getElementById('importantDateTime').value = "09:00";
  // Calculator Init
  const calcDisplayElem = document.getElementById('calcDisplay'); if (calcDisplayElem) { calcDisplayElem.textContent = calcDisplayValue; }
  const conversionTypeSelect = document.getElementById('conversionType'); if (conversionTypeSelect) { conversionTypeSelect.addEventListener('change', updateConversionUnits); updateConversionUnits(); }
  const fromValueInput = document.getElementById('fromValue'); if (fromValueInput) { fromValueInput.addEventListener('input', convertUnits); }
});
