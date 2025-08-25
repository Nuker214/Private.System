import discord
from discord.ext import commands
import os
import asyncio
import logging
import aiohttp
import json
from threading import Thread

# --- Configuration Imports ---
from config import (
    DISCORD_TOKEN, COMMAND_PREFIX, WEBSITE_API_BASE_URL, ADMIN_ROLE_ID,
    WEBSITE_CHANNEL_ID, LOGIN_CHANNEL_ID, DISCONNECTED_CHANNEL_ID,
    LOGGING_CHANNEL_ID, ERROR_CHANNEL_ID
)

# --- Integrated Whitelist Data ---
# ... (WHITELIST_DATA as before) ...
WHITELIST_DATA = [
  {
    "name": "Testing Purposes",
    "username": "TEST",
    "password": "Testing.2579",
    "rank": 9999,
    "role": "Unauthorized User",
    "userID": "9999",
    "accountCreationDate": "2025-08-19T11:25:00Z",
    "status": "active"
  },
  {
    "name": "Beta Tester",
    "username": "Tester",
    "password": "DEMO_PASSWORD_Tester",
    "rank": 1,
    "role": "Partial Access User",
    "userID": "1",
    "accountCreationDate": "2024-08-19T11:25:00Z",
    "status": "active"
  },
  {
    "name": "Curtis",
    "password": "DEMO_PASSWORD_Zapperix",
    "rank": 12,
    "role": "Normal User",
    "userID": "3923",
    "accountCreationDate": "2024-08-18T20:01:00Z",
    "status": "active"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zillionix",
    "password": "DEMO_PASSWORD_Zillionix",
    "rank": 20,
    "role": "Normal User",
    "userID": "1083",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zynthex",
    "password": "DEMO_PASSWORD_Zynthex",
    "rank": 8,
    "role": "Normal User",
    "userID": "8471",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zabbleon",
    "password": "DEMO_PASSWORD_Zabbleon",
    "rank": 15,
    "role": "Normal User",
    "userID": "6902",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zenkora",
    "password": "DEMO_PASSWORD_Zenkora",
    "rank": 10,
    "role": "Normal User",
    "userID": "7582",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zorvane",
    "password": "DEMO_PASSWORD_Zorvane",
    "rank": 18,
    "role": "Normal User",
    "userID": "2193",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Ziphros",
    "password": "DEMO_PASSWORD_Ziphros",
    "rank": 7,
    "role": "Normal User",
    "userID": "9901",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zorkael",
    "password": "DEMO_PASSWORD_Zorkael",
    "rank": 25,
    "role": "Normal User",
    "userID": "3258",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zyncope",
    "password": "DEMO_PASSWORD_Zyncope",
    "rank": 5,
    "role": "Normal User",
    "userID": "4291",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Zermion",
    "password": "DEMO_PASSWORD_Zermion",
    "rank": 11,
    "role": "Normal User",
    "userID": "5803",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xylander",
    "password": "DEMO_PASSWORD_Xylander",
    "rank": 9,
    "role": "Normal User",
    "userID": "6592",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xavorian",
    "password": "DEMO_PASSWORD_Xavorian",
    "rank": 14,
    "role": "Normal User",
    "userID": "1495",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xandrex",
    "password": "DEMO_PASSWORD_Xandrex",
    "rank": 13,
    "role": "Normal User",
    "userID": "8620",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xenplix",
    "password": "DEMO_PASSWORD_Xenplix",
    "rank": 6,
    "role": "Normal User",
    "userID": "4920",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xyndora",
    "password": "DEMO_PASSWORD_Xyndora",
    "rank": 22,
    "role": "Normal User",
    "userID": "6328",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xennova",
    "password": "DEMO_PASSWORD_Xennova",
    "rank": 17,
    "role": "Normal User",
    "userID": "1776",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xebiron",
    "password": "DEMO_PASSWORD_Xebiron",
    "rank": 4,
    "role": "Normal User",
    "userID": "7940",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xortian",
    "password": "DEMO_PASSWORD_Xortian",
    "rank": 21,
    "role": "Normal User",
    "userID": "2983",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xurphon",
    "password": "DEMO_PASSWORD_Xurphon",
    "rank": 16,
    "role": "Normal User",
    "userID": "9123",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Xelquon",
    "password": "DEMO_PASSWORD_Xelquon",
    "rank": 19,
    "role": "Normal User",
    "userID": "2334",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yanthor",
    "password": "DEMO_PASSWORD_Yanthor",
    "rank": 8,
    "role": "Normal User",
    "userID": "7173",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yeltrax",
    "password": "DEMO_PASSWORD_Yeltrax",
    "rank": 24,
    "role": "Normal User",
    "userID": "8372",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yomplex",
    "password": "DEMO_PASSWORD_Yomplex",
    "rank": 3,
    "role": "Normal User",
    "userID": "1648",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yerpion",
    "password": "DEMO_PASSWORD_Yerpion",
    "rank": 20,
    "role": "Normal User",
    "userID": "3417",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yeznith",
    "password": "DEMO_PASSWORD_Yeznith",
    "rank": 10,
    "role": "Normal User",
    "userID": "9821",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yxorian",
    "password": "DEMO_PASSWORD_Yxorian",
    "rank": 12,
    "role": "Normal User",
    "userID": "7542",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yimzorn",
    "password": "DEMO_PASSWORD_Yimzorn",
    "rank": 7,
    "role": "Normal User",
    "userID": "3842",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yumbrix",
    "password": "DEMO_PASSWORD_Yumbrix",
    "rank": 15,
    "role": "Normal User",
    "userID": "2167",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yarlion",
    "password": "DEMO_PASSWORD_Yarlion",
    "rank": 18,
    "role": "Normal User",
    "userID": "6230",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yaxtren",
    "password": "DEMO_PASSWORD_Yaxtren",
    "rank": 9,
    "role": "Normal User",
    "userID": "1533",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Yevoron",
    "password": "DEMO_PASSWORD_Yevoron",
    "rank": 21,
    "role": "Normal User",
    "userID": "5864",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Oblinex",
    "password": "DEMO_PASSWORD_Oblinex",
    "rank": 13,
    "role": "Normal User",
    "userID": "8894",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Obrixel",
    "password": "DEMO_PASSWORD_Obrixel",
    "rank": 6,
    "role": "Normal User",
    "userID": "7254",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Orvenix",
    "password": "DEMO_PASSWORD_Orvenix",
    "rank": 14,
    "role": "Normal User",
    "userID": "1416",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Oxlurion",
    "password": "DEMO_PASSWORD_Oxlurion",
    "rank": 8,
    "role": "Normal User",
    "userID": "6009",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Oxandor",
    "password": "DEMO_PASSWORD_Oxandor",
    "rank": 11,
    "role": "Normal User",
    "userID": "9874",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Ontriex",
    "password": "DEMO_PASSWORD_Ontriex",
    "rank": 16,
    "role": "Normal User",
    "userID": "4012",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Ozintor",
    "password": "DEMO_PASSWORD_Ozintor",
    "rank": 7,
    "role": "Normal User",
    "userID": "1933",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Ozmanix",
    "password": "DEMO_PASSWORD_Ozmanix",
    "rank": 19,
    "role": "Normal User",
    "userID": "5055",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Oxyplex",
    "password": "DEMO_PASSWORD_Oxyplex",
    "rank": 5,
    "role": "Normal User",
    "userID": "3372",
    "accountCreationDate": None,
    "status": "pending"
  },
  {
    "name": "Not Set Up Yet",
    "username": "Orthonel",
    "password": "DEMO_PASSWORD_Orthonel",
    "rank": 20,
    "role": "Normal User",
    "userID": "8632",
    "accountCreationDate": None,
    "status": "pending"
  }
]


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


# --- Flask App Initialization (Serves web pages and API for Discord bot & Frontend) ---
from flask import Flask, render_template_string, request, jsonify, send_from_directory, current_app
web_app = Flask(__name__, static_folder='static', static_url_path='/')
# Render's Web Service injects a 'PORT' environment variable.
# Flask should bind to '0.0.0.0' and this 'PORT'.
WEB_SERVER_PORT = int(os.getenv("PORT", 8000)) # Default to 8000 for local testing


# --- Flask Routes to Serve Static Files ---
@web_app.route('/')
def serve_index():
    # Serves the index.html from the 'static' folder when root URL is accessed.
    return send_from_directory('static', 'index.html')

@web_app.route('/<path:filename>')
def serve_static(filename):
    # This route serves any other static files (CSS, JS, images)
    # from the 'static' folder directly.
    return send_from_directory('static', filename)


# --- Flask API Endpoints (For Frontend & Discord Bot Interaction) ---

# Frontend requests this to get whitelist data for client-side authentication.
@web_app.route('/api/whitelist', methods=['GET'])
def api_get_whitelist():
    logger.info("[WEB_API] Frontend requested whitelist data.")
    # Return the in-memory WHITELIST_DATA
    return jsonify(WHITELIST_DATA), 200


# --- Discord Bot's Backend-facing API (These endpoints are called by Discord bot commands) ---

@web_app.route('/api/users/<user_id>/info', methods=['GET'])
def api_get_user_info_for_bot(user_id):
    """Retrieves user information for the Discord bot, querying WHITELIST_DATA."""
    # Find user by userID or username
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)

    if user_info:
        # Create a copy to remove sensitive password before sending (mock for production)
        safe_user_info = user_info.copy()
        safe_user_info.pop("password", None) # Remove password for security
        # Add a mock online status
        safe_user_info["is_online"] = True if safe_user_info["username"] in ["TEST", "Tester", "Zapperix"] else False # Mock active users
        logger.info(f"[WEB_API] Retrieved user info for bot: {user_id}")
        return jsonify({"status": "success", "data": safe_user_info}), 200

    logger.warning(f"[WEB_API] User info for bot: {user_id} not found.")
    return jsonify({"status": "error", "message": f"User {user_id} not found in whitelist."}), 404

@web_app.route('/api/online_users', methods=['GET'])
def api_get_online_users_for_bot():
    """Returns a list of currently 'online' users, based on WHITELIST_DATA with mock status."""
    online_users_list = []
    for user in WHITELIST_DATA:
        # Simple mock logic for 'online' status for now
        if user["status"] == "active" and user["username"] in ["TEST", "Tester", "Zapperix"]:
            online_users_list.append({"user_id": user["userID"], "username": user["username"], "status": "online"})
    
    logger.info("[WEB_API] Retrieved mock online users for bot.")
    return jsonify({"status": "success", "data": online_users_list}), 200

# Mock for user stats, dynamically generates based on userID
@web_app.route('/api/users/<user_id>/stats', methods=['GET'])
def api_get_user_stats_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info:
        # Mock stats data for the user (can be dynamic based on userID)
        stats_data = {
            "username": user_info["username"],
            "total_clicks": 100 + (int(user_id) % 50 if user_id.isdigit() else 0),
            "session_count": 5 + (int(user_id) % 3 if user_id.isdigit() else 0),
            "avg_session_time": f"{1 + (int(user_id) % 2 if user_id.isdigit() else 0)}h {(10 + (int(user_id) % 30 if user_id.isdigit() else 0))}m",
            "error_count": (int(user_id) % 5 if user_id.isdigit() else 0),
            "last_activity": "2025-08-25 10:30:00Z"
        }
        logger.info(f"[WEB_API] Retrieved mock stats for user {user_id} for bot.")
        return jsonify({"status": "success", "data": stats_data}), 200
    logger.warning(f"[WEB_API] Stats for bot: User {user_id} not found in whitelist.")
    return jsonify({"status": "error", "message": f"Stats for user {user_id} not found."}), 404

# Mock for user session time
@web_app.route('/api/users/<user_id>/session_time', methods=['GET'])
def api_get_user_session_time_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info:
        session_time_str = f"{(int(user_id) % 3 if user_id.isdigit() else 1)}h {(int(user_id) % 59 if user_id.isdigit() else 30)}m"
        logger.info(f"[WEB_API] Retrieved mock session time for user {user_id} for bot.")
        return jsonify({"status": "success", "data": {"current_session_time": session_time_str}}), 200
    logger.warning(f"[WEB_API] Session time for bot: User {user_id} not found in whitelist.")
    return jsonify({"status": "error", "message": f"Session time for user {user_id} not found."}), 404

# Mock for user notes
@web_app.route('/api/users/<user_id>/notes', methods=['GET'])
def api_get_user_notes_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info:
        mock_notes = f"This is a mock note for {user_info['username']}. They are a {user_info['role']}."
        logger.info(f"[WEB_API] Retrieved mock notes for user {user_id} for bot.")
        return jsonify({"status": "success", "data": {"notes": mock_notes}}), 200
    logger.warning(f"[WEB_API] Notes for bot: User {user_id} not found in whitelist.")
    return jsonify({"status": "error", "message": f"Notes for user {user_id} not found."}), 404

# Mock for device info
@web_app.route('/api/users/<user_id>/device_info', methods=['GET'])
def api_get_user_device_info_for_bot(user_id):
    user_info = next((user for user in WHITELIST_DATA if str(user["userID"]) == user_id or user["username"] == user_id), None)
    if user_info:
        mock_device_info = {
            "user_agent": "Mozilla/5.0 (Mock) Chrome/116.0.0.0",
            "ip_address": "192.168.1.1 (Mock Internal)",
            "browser": "Chrome (Mock)",
            "os": "Linux (Mock)",
            "screen_resolution": "1920x1080 (Mock)"
        }
        logger.info(f"[WEB_API] Retrieved mock device info for user {user_id} for bot.")
        return jsonify({"status": "success", "data": mock_device_info}), 200
    logger.warning(f"[WEB_API] Device info for bot: User {user_id} not found in whitelist.")
    return jsonify({"status": "error", "message": f"Device info for user {user_id} not found."}), 404

# --- API Endpoints for Bot-Triggered Actions (Mocks for now) ---
@web_app.route('/api/user/logout', methods=['POST'])
def api_bot_logout_user():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested user logout for {user_id}.")
    # TODO: Implement actual session termination for this user.
    return jsonify({"status": "success", "message": f"Logout request for {user_id} received. Implementation pending."}), 200

@web_app.route('/api/user/panic', methods=['POST'])
def api_bot_panic_user():
    data = request.json
    user_id = data.get('user_id')
    url = data.get('url')
    logger.info(f"[WEB_API] Bot requested user {user_id} to panic to {url}.")
    # TODO: Implement real-time panic/redirect via WebSockets to the client's browser.
    return jsonify({"status": "success", "message": f"Panic request for {user_id} to {url} received. Implementation pending."}), 200

@web_app.route('/api/user/zoom', methods=['POST'])
def api_bot_zoom_user():
    data = request.json
    user_id = data.get('user_id')
    level = data.get('level')
    logger.info(f"[WEB_API] Bot requested zoom level {level} for user {user_id}.")
    # TODO: Implement real-time zoom control via WebSockets to the client's browser.
    return jsonify({"status": "success", "message": f"Zoom request for {user_id} to {level}% received. Implementation pending."}), 200

@web_app.route('/api/user/clear_updates', methods=['POST'])
def api_bot_clear_updates():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to clear updates for user {user_id}.")
    # TODO: Implement logic to clear user updates.
    return jsonify({"status": "success", "message": f"Clear updates for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/clear_notifications', methods=['POST'])
def api_bot_clear_notifications():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to clear notifications for user {user_id}.")
    # TODO: Implement logic to clear user notifications.
    return jsonify({"status": "success", "message": f"Clear notifications for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/clear_activity', methods=['POST'])
def api_bot_clear_activity():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to clear activity for user {user_id}.")
    # TODO: Implement logic to clear user activity logs.
    return jsonify({"status": "success", "message": f"Clear activity for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/clear_errors', methods=['POST'])
def api_bot_clear_errors():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to clear errors for user {user_id}.")
    # TODO: Implement logic to clear user error logs.
    return jsonify({"status": "success", "message": f"Clear errors for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/clear_login_history', methods=['POST'])
def api_bot_clear_login_history():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to clear login history for user {user_id}.")
    # TODO: Implement logic to clear user login history.
    return jsonify({"status": "success", "message": f"Clear login history for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/clear_all_data', methods=['POST'])
def api_bot_clear_all_data():
    data = request.json
    user_id = data.get('user_id')
    logger.warning(f"[WEB_API] Bot requested to clear ALL data for user {user_id}.")
    # TODO: Implement logic to clear ALL user data. Requires extreme caution.
    return jsonify({"status": "success", "message": f"Clear all data for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/set_clicks', methods=['POST'])
def api_bot_set_clicks():
    data = request.json
    user_id = data.get('user_id')
    count = data.get('count')
    logger.info(f"[WEB_API] Bot requested to set clicks for user {user_id} to {count}.")
    # TODO: Implement logic to set user clicks.
    return jsonify({"status": "success", "message": f"Set clicks for {user_id} to {count} request received. Implementation pending."}), 200

@web_app.route('/api/user/clear_clicks', methods=['POST'])
def api_bot_clear_clicks():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to clear clicks for user {user_id}.")
    # TODO: Implement logic to clear user clicks.
    return jsonify({"status": "success", "message": f"Clear clicks for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/set_announcement', methods=['POST'])
def api_bot_set_announcement():
    data = request.json
    user_id = data.get('user_id')
    message = data.get('message')
    logger.info(f"[WEB_API] Bot requested to set announcement for user {user_id}: {message}.")
    # TODO: Implement logic to set custom announcement for user.
    return jsonify({"status": "success", "message": f"Set announcement for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/restart_page', methods=['POST'])
def api_bot_restart_page():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested to restart page for user {user_id}.")
    # TODO: Implement logic to restart user page.
    return jsonify({"status": "success", "message": f"Restart page for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/set_theme', methods=['POST'])
def api_bot_set_theme():
    data = request.json
    user_id = data.get('user_id')
    theme = data.get('theme_name')
    logger.info(f"[WEB_API] Bot requested to set theme for user {user_id} to {theme}.")
    # TODO: Implement logic to set user theme.
    return jsonify({"status": "success", "message": f"Set theme for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/set_dashboard_color', methods=['POST'])
def api_bot_set_dashboard_color():
    data = request.json
    user_id = data.get('user_id')
    color = data.get('color')
    logger.info(f"[WEB_API] Bot requested to set dashboard color for user {user_id} to {color}.")
    # TODO: Implement logic to set user dashboard color.
    return jsonify({"status": "success", "message": f"Set dashboard color for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/set_event', methods=['POST'])
def api_bot_set_event():
    data = request.json
    user_id = data.get('user_id')
    event_name = data.get('event_name')
    message = data.get('message')
    logger.info(f"[WEB_API] Bot requested to set event for user {user_id}: {event_name} - {message}.")
    # TODO: Implement logic to set custom event for user.
    return jsonify({"status": "success", "message": f"Set event for {user_id} request received. Implementation pending."}), 200

@web_app.route('/api/user/control_section', methods=['POST'])
def api_bot_control_section():
    data = request.json
    user_id = data.get('user_id')
    action = data.get('action')
    section = data.get('section')
    logger.info(f"[WEB_API] Bot requested to {action} section {section} for user {user_id}.")
    # TODO: Implement logic to control user website sections.
    return jsonify({"status": "success", "message": f"Control section for {user_id} ({action} {section}) request received. Implementation pending."}), 200

@web_app.route('/api/user/screenshot', methods=['POST'])
def api_bot_screenshot_user():
    data = request.json
    user_id = data.get('user_id')
    logger.info(f"[WEB_API] Bot requested screenshot for user {user_id}.")
    # In a real app, this would trigger client-side JS to take a screenshot,
    # upload it back to this backend, and this backend would return an image URL.
    mock_image_url = "https://picsum.photos/800/600" # Placeholder image URL
    return jsonify({"status": "success", "message": f"Bot requested screenshot for {user_id}. Implementation pending.", "data": {"image_url": mock_image_url}}), 200


# --- Discord Bot Core ---
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
# Disable default help command so we can define our own
bot = commands.Bot(command_prefix=COMMAND_PREFIX, intents=intents, help_command=None)


# --- Attach Discord Handlers (Called within bot.on_ready event) ---
class DiscordHandler(logging.Handler):
    """
    A custom logging handler that sends log records to a specific Discord channel.
    It formats ERROR/CRITICAL logs into embeds for better visibility.
    """
    def __init__(self, bot_instance, channel_id, level=logging.NOTSET):
        super().__init__(level)
        self.bot = bot_instance
        self.channel_id = channel_id
        self.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))

    def emit(self, record):
        if not self.bot or not self.bot.is_ready():
            return # Can't send to Discord if bot isn't ready or still connecting

        channel = self.bot.get_channel(self.channel_id)
        if not channel:
            # Fallback to console print if Discord channel itself is not found/accessible
            print(f"[{self.__class__.__name__}] ERROR: Configured Discord channel with ID {self.channel_id} not found. "
                  f"Log: {self.format(record)}")
            return

        # Schedule the coroutine to send the message using the bot's event loop
        self.bot.loop.create_task(self.send_to_discord(channel, record))

    async def send_to_discord(self, channel, record):
        try:
            # Use extra attributes for better embed fields, falling back to "N/A"
            guild_info = getattr(record, 'guild_name', "N/A")
            channel_info = getattr(record, 'channel_name', "N/A")
            user_info = f"{getattr(record, 'user_name', 'N/A')} (ID: {getattr(record, 'user_id', 'N/A')})"
            command_info = getattr(record, 'command_name', "N/A")
            full_command_info = getattr(record, 'full_command', "N/A")


            if record.levelname == 'ERROR' or record.levelname == 'CRITICAL':
                embed = discord.Embed(
                    title=f"❌ {record.levelname}: {record.name}",
                    description=f"```py\n{record.message}```", # Present message in code block
                    color=discord.Color.red(),
                    timestamp=discord.utils.utcnow()
                )
                embed.add_field(name="Source", value=f"`{record.filename}:{record.lineno}`", inline=True)
                embed.add_field(name="Guild", value=guild_info, inline=True)
                embed.add_field(name="Channel", value=channel_info, inline=True)
                if command_info != "N/A": embed.add_field(name="Command", value=command_info, inline=True)
                if user_info != "N/A": embed.add_field(name="User", value=user_info, inline=True)
                if full_command_info != "N/A": embed.add_field(name="Full Command", value=f"`{full_command_info}`", inline=False)


                if record.exc_text: # Contains traceback
                    trace = record.exc_text
                    if len(trace) > 1024:
                        trace = trace[:1020] + "..." # Truncate if too long for field value
                    embed.add_field(name="Traceback", value=f"```py\n{trace}```", inline=False)

                await channel.send(embed=embed)

            elif record.levelname == 'WARNING':
                embed = discord.Embed(
                    title=f"⚠️ {record.levelname}: {record.name}",
                    description=f"`{record.message}`",
                    color=discord.Color.gold(),
                    timestamp=discord.utils.utcnow()
                )
                embed.add_field(name="Source", value=f"`{record.filename}:{record.lineno}`", inline=True)
                embed.add_field(name="Guild", value=guild_info, inline=True)
                embed.add_field(name="Channel", value=channel_info, inline=True)
                if user_info != "N/A": embed.add_field(name="User", value=user_info, inline=True)
                await channel.send(embed=embed)

            elif record.levelname == 'INFO':
                # General info logs as a simple message to reduce embed spam in busy log channels
                await channel.send(f"[`{record.asctime.split(',')[0]} INFO`] {record.message}")
            else:
                await channel.send(f"[{record.levelname}] {record.message}")
        except discord.Forbidden:
            print(f"[{self.__class__.__name__}] ERROR: Missing permissions for Discord channel '{channel.name}' (ID: {channel.id}). Cannot send log.")
        except discord.HTTPException as e:
            print(f"[{self.__class__.__name__}] ERROR: Failed to send log to Discord channel '{channel.name}' (ID: {channel.id}) - HTTP error {e.status}: {e.text}")
        except Exception as e:
            print(f"[{self.__class__.__name__}] CRITICAL: Unexpected error when trying to send log to Discord: {e}", exc_info=True)


# --- Discord-triggered Website Interaction functions (used by Discord commands) ---
async def website_send_command(endpoint: str, user_id: str = None, **kwargs):
    # This calls YOUR OWN Flask API which needs to implement /api/user/logout etc.
    # It dynamically constructs the base URL for internal communication
    api_base = f"http://localhost:{WEB_SERVER_PORT}"
    full_url = f"{api_base}{endpoint}"
    payload = {"user_id": user_id, **kwargs}
    logger.info(f"[Website API] Bot sending command: {full_url} with payload: {payload}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(full_url, json=payload) as response:
                response.raise_for_status()
                data = await response.json()
                logger.info(f"[Website API] Bot received response ({response.status}) from {full_url}: {data}")
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"[Website API] Bot-to-API error {e.status} for {full_url}. Response: {e.message}", exc_info=True, extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"[Website API] Bot failed to connect to local Flask API at {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        return {"status": "error", "message": f"Could not connect to internal Flask API."}
    except Exception as e:
        logger.error(f"[Website API] Bot-side unexpected error interacting with Flask API {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        return {"status": "error", "message": f"An unexpected error occurred in bot-to-website interaction."}

async def website_get_data(endpoint: str, user_id: str = None):
    # Similar to website_send_command, calls the local Flask API.
    api_base = f"http://localhost:{WEB_SERVER_PORT}"
    query_params = f"?user_id={user_id}" if user_id else ""
    full_url = f"{api_base}{endpoint}{query_params}"
    logger.info(f"[Website API] Bot fetching data from: {full_url}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(full_url) as response:
                response.raise_for_status()
                data = await response.json()
                logger.info(f"[Website API] Bot received response ({response.status}) from {full_url}: {data}")
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"[Website API] Bot-to-API error {e.status} for {full_url}. Response: {e.message}", exc_info=True, extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"[Website API] Bot failed to connect to local Flask API at {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        return {"status": "error", "message": f"Could not connect to internal Flask API."}
    except Exception as e:
        logger.error(f"[Website API] Bot-side unexpected error fetching from Flask API {full_url}: {e}", exc_info=True, extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        return {"status": "error", "message": f"An unexpected error occurred in bot-to-website data fetch."}


# --- Bot's internal functions for User Connection/Disconnection Announcements ---
# These can be called by the Flask app (e.g., when login/logout API is hit for real-time internal status change).
# The frontend client handles its own webhooks now, so these are mostly for backend's internal use if any logic requires the bot to speak.
async def bot_user_connected_announcement(user_id: str, username: str = "Unknown User"):
    """Sends a user connected message to Discord's LOGIN_CHANNEL_ID (if triggered internally)."""
    if LOGIN_CHANNEL_ID == 0:
        logger.warning(f"LOGIN_CHANNEL_ID is 0. Cannot send user connected announcement for {username}.")
        return

    channel = bot.get_channel(LOGIN_CHANNEL_ID)
    if channel:
        await channel.send(f"🟢 **{username}** (ID: `{user_id}`) Has Been Connected.. Awaiting Commands.")
        logger.info(f"Announced user '{username}' (ID: {user_id}) connected to Discord channel: {channel.name} ({LOGIN_CHANNEL_ID})")
    else:
        logger.warning(f"Configured LOGIN_CHANNEL_ID ({LOGIN_CHANNEL_ID}) not found or bot lacks permissions. "
                       f"Cannot announce user '{username}' connected.")

async def bot_user_disconnected_announcement(user_id: str, username: str = "Unknown User"):
    """Sends a user disconnected message to Discord's DISCONNECTED_CHANNEL_ID (if triggered internally)."""
    if DISCONNECTED_CHANNEL_ID == 0:
        logger.warning(f"DISCONNECTED_CHANNEL_ID is 0. Cannot send user disconnected announcement for {username}.")
        return

    channel = bot.get_channel(DISCONNECTED_CHANNEL_ID)
    if channel:
        await channel.send(f"🔴 **{username}** (ID: `{user_id}`) Has Been Disconnected..")
        logger.info(f"Announced user '{username}' (ID: {user_id}) disconnected to Discord channel: {channel.name} ({DISCONNECTED_CHANNEL_ID})")
    else:
        logger.warning(f"Configured DISCONNECTED_CHANNEL_ID ({DISCONNECTED_CHANNEL_ID}) not found or bot lacks permissions. "
                       f"Cannot announce user '{username}' disconnected.")


# --- Bot Events ---
@bot.event
async def on_ready():
    logger.info(f'Logged in as {bot.user.name} ({bot.user.id})')
    logger.info('Bot is ready!')

    # Attach Discord Logging Handlers once the bot object is fully initialized and ready
    if LOGGING_CHANNEL_ID != 0:
        discord_log_handler = DiscordHandler(bot, LOGGING_CHANNEL_ID, level=logging.INFO)
        logger.addHandler(discord_log_handler)
        logger.info(f"Attached DiscordHandler for general logs to channel ID {LOGGING_CHANNEL_ID}")
    else:
        logger.warning("LOGGING_CHANNEL_ID not set or is 0. General bot activity will not be logged to Discord.")

    if ERROR_CHANNEL_ID != 0:
        discord_error_handler = DiscordHandler(bot, ERROR_CHANNEL_ID, level=logging.ERROR)
        logger.addHandler(discord_error_handler)
        logger.info(f"Attached DiscordHandler for error logs to channel ID {ERROR_CHANNEL_ID}")
    else:
        logger.critical("ERROR_CHANNEL_ID not set or is 0. Critical errors will NOT be logged to a Discord channel.")

    # Send initial 'System Online' message to WEBSITE_CHANNEL_ID
    if WEBSITE_CHANNEL_ID != 0:
        channel = bot.get_channel(WEBSITE_CHANNEL_ID)
        if channel:
            await channel.send("System Is Now Online. Waiting for commands..")
            logger.info(f"Sent 'System Online' message to Discord channel: {channel.name} (ID: {WEBSITE_CHANNEL_ID})")
        else:
            logger.warning(f"Configured WEBSITE_CHANNEL_ID ({WEBSITE_CHANNEL_ID}) not found or bot lacks permissions. "
                            "Cannot announce system online status to Discord.")
    else:
        logger.warning("WEBSITE_CHANNEL_ID not set or is 0. System online status will not be announced to Discord.")


@bot.event
async def on_disconnect():
    """Called when the bot loses its connection to Discord (e.g., due to network issues, or bot restart)."""
    logger.critical("Bot has disconnected from Discord!")

    if DISCONNECTED_CHANNEL_ID != 0:
        disconnect_channel = bot.get_channel(DISCONNECTED_CHANNEL_ID)
        if disconnect_channel:
            embed = discord.Embed(
                title="🔴 Bot Disconnected!",
                description=f"The bot **{bot.user.name}** has lost connection to Discord. Check logs for details.",
                color=discord.Color.red(),
                timestamp=discord.utils.utcnow()
            )
            embed.set_footer(text="Attempting to reconnect..." if bot.is_ws_ratelimited() else "Might be manual restart or fatal error.")
            try:
                await disconnect_channel.send(embed=embed)
                logger.warning(f"Sent 'Bot Disconnected' message to channel {disconnect_channel.name} ({DISCONNECTED_CHANNEL_ID}).")
            except (discord.Forbidden, discord.HTTPException) as e:
                logger.error(f"Failed to send 'Bot Disconnected' message to channel {DISCONNECTED_CHANNEL_ID} (permissions/HTTP error): {e}")
        else:
            logger.critical(f"Bot disconnected, but configured DISCONNECTED_CHANNEL_ID ({DISCONNECTED_CHANNEL_ID}) for bot's own status is invalid or not found. Cannot send notification.")
    else:
        logger.critical("Bot disconnected, but DISCONNECTED_CHANNEL_ID (for bot's own status) is not set or is 0. Cannot send notification.")


@bot.event
async def on_message(message):
    """Called every time a message is sent in a channel the bot can see."""
    if message.author == bot.user:
        return # Ignore messages from the bot itself

    # No direct simulation for client-connect/disconnect here from Discord message
    # as `script.js` handles client-side webhooks for frontend logins/logouts.

    await bot.process_commands(message)


@bot.event
async def on_command(ctx):
    """Logs when a command is successfully invoked to both file/console and Discord logging channel."""
    guild_name = ctx.guild.name if ctx.guild else "DM"
    channel_name = ctx.channel.name if ctx.channel else "DM"
    command_args = ctx.args[2:] if len(ctx.args) > 2 else [] # Exclude ctx, self from args

    log_message = (f"Command '{ctx.command.name}' invoked by {ctx.author} (ID: {ctx.author.id}) "
                   f"in #{channel_name} (Guild: {guild_name}, ID: {ctx.guild.id if ctx.guild else '0'}) "
                   f"Args: {command_args}")
    logger.info(log_message,
                extra={'guild_name': guild_name,
                       'channel_name': channel_name,
                       'command_name': ctx.command.name,
                       'user_name': str(ctx.author),
                       'user_id': ctx.author.id,
                       'full_command': ctx.message.content}) # Full message as entered by user


@bot.event
async def on_command_error(ctx, error):
    """Handles errors that occur during command execution."""

    error_context = {
        'guild_name': ctx.guild.name if ctx.guild else "DM",
        'channel_name': ctx.channel.name if ctx.channel else "DM",
        'command_name': ctx.command.name if hasattr(ctx, 'command') and ctx.command else "N/A",
        'user_name': str(ctx.author),
        'user_id': ctx.author.id,
        'full_command': ctx.message.content
    }

    if isinstance(error, commands.CommandNotFound):
        # Log to console/file/LOGGING_CHANNEL, but typically don't spam user in Discord
        logger.warning(f"Command '{ctx.message.content}' not found. Invoked by {ctx.author} (ID: {ctx.author.id}).", extra=error_context)
        return
    elif isinstance(error, commands.MissingRequiredArgument):
        await ctx.send(f"Error: Missing required argument(s) for command `{error_context['command_name']}`. "
                       f"Please check `{COMMAND_PREFIX}help {error_context['command_name']}` for usage. Details: `{error}`")
        logger.warning(f"Missing arguments for command '{error_context['command_name']}' by {ctx.author}: {error}", extra=error_context)
    elif isinstance(error, commands.BadArgument):
        await ctx.send(f"Error: Invalid argument(s) for command `{error_context['command_name']}`. "
                       f"Please check `{COMMAND_PREFIX}help {error_context['command_name']}`. Details: `{error}`")
        logger.warning(f"Bad arguments for command '{error_context['command_name']}' by {ctx.author}: {error}", extra=error_context)
    elif isinstance(error, commands.MissingPermissions) or \
         isinstance(error, commands.NotOwner) or \
         isinstance(error, commands.CheckFailure): # Catches custom checks like @is_admin() failures
        await ctx.send("You do not have the necessary permissions to use this command.")
        logger.warning(f"Permission denied for command '{error_context['command_name']}' by {ctx.author}: {error}", extra=error_context)
    else:
        # For all other unhandled and potentially serious errors
        error_message_for_user = (f"An unexpected error occurred while executing command `{error_context['command_name']}`. "
                                  "An administrator has been notified. Details have been logged.")
        await ctx.send(error_message_for_user)
        # This error is critical enough to go to ERROR_CHANNEL via the DiscordHandler setup
        logger.error(f"Unhandled error in command '{error_context['command_name']}' invoked by {ctx.author}: {error}", exc_info=True, extra=error_context)


# --- Helper for Admin Role Check ---
def is_admin():
    """
    Decorator to check if the command invoker has the ADMIN_ROLE_ID configured.
    Raises CheckFailure if not met, which is caught by on_command_error.
    """
    async def predicate(ctx):
        if not ADMIN_ROLE_ID:
            logger.debug("ADMIN_ROLE_ID not set in config, bypassing admin check.",
                         extra={'user_name': str(ctx.author), 'user_id': ctx.author.id})
            return True # If no admin role is configured, all commands are unrestricted

        if not ctx.guild:
            # Command invoked in DMs, but admin commands often need a guild context
            raise commands.CheckFailure("This command can only be used in a server.")

        admin_role = discord.utils.get(ctx.guild.roles, id=ADMIN_ROLE_ID)
        if admin_role and admin_role in ctx.author.roles:
            logger.debug(f"Admin check passed for {ctx.author}.",
                         extra={'user_name': str(ctx.author), 'user_id': ctx.author.id, 'guild_name': ctx.guild.name})
            return True
        else:
            if admin_role:
                # Role exists, but user doesn't have it
                logger.warning(f"Admin check failed for {ctx.author}: Missing role '{admin_role.name}'.",
                               extra={'guild_name': ctx.guild.name, 'guild_id': ctx.guild.id,
                                      'user_name': str(ctx.author), 'user_id': ctx.author.id})
                raise commands.CheckFailure(f"You need the role '{admin_role.name}' to use this command.")
            else:
                # Configured ADMIN_ROLE_ID does not exist in this specific guild
                logger.error(f"Configured ADMIN_ROLE_ID ({ADMIN_ROLE_ID}) not found in guild {ctx.guild.id}. "
                             f"Admin check failed for {ctx.author}.",
                             extra={'guild_name': ctx.guild.name, 'guild_id': ctx.guild.id,
                                    'user_name': str(ctx.author), 'user_id': ctx.author.id})
                raise commands.CheckFailure(f"Admin role configured (ID: {ADMIN_ROLE_ID}) does not exist in this server. Please check config.")
    return commands.check(predicate)

# --- Discord Bot Commands ---
@bot.command(name='help')
async def help_command(ctx):
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
    """Shows detailed information about a specified user."""
    await ctx.send(f"Fetching information for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/api/users/{user_id}/info") # Calls Flask route in this file
        if response_data and response_data.get("status") == "success":
            user_data = response_data.get("data", {})
            if user_data:
                embed = discord.Embed(
                    title=f"User Information: {user_data.get('username', user_id)}",
                    color=0x3498db
                )
                embed.add_field(name="User ID", value=user_data.get('user_id', 'N/A'), inline=True)
                embed.add_field(name="Name", value=user_data.get('name', 'N/A'), inline=True)
                embed.add_field(name="Email", value=user_data.get('email', 'N/A'), inline=True)
                embed.add_field(name="Online Status", value="✅ Online" if user_data.get('is_online', False) else "❌ Offline", inline=True)
                embed.add_field(name="Last Login", value=user_data.get('last_login', 'N/A'), inline=False)
                await ctx.send(embed=embed)
            else:
                await ctx.send(f"No detailed data found for user `{user_id}`.")
        else:
            await ctx.send(f"Could not retrieve information for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in user_information command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Information', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching user information for `{user_id}`. Please try again later.")

@bot.command(name='Online')
async def online_users(ctx):
    """Shows all online users logged in."""
    await ctx.send("Fetching online users...")
    try:
        response_data = await website_get_data("/api/online_users") # Calls Flask route in this file
        if response_data and response_data.get("status") == "success":
            users = response_data.get("data", [])
            if users:
                online_list = "\n".join([f"- `{u.get('username', 'N/A')}` (ID: `{u.get('user_id', 'N/A')}`)" for u in users])
                embed = discord.Embed(title="🌐 Currently Online Users", description=online_list, color=0x2ecc71)
                embed.set_footer(text=f"Total: {len(users)} users online.")
                await ctx.send(embed=embed)
            else:
                await ctx.send("No users are currently online.")
        else:
            await ctx.send(f"Could not fetch online users. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in online_users command by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Online', 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching online users. Please try again later.")

@bot.command(name='Logout')
async def logout_user(ctx, user_id: str):
    """Logs out the specified user from the site."""
    await ctx.send(f"Attempting to log out user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/logout", user_id=user_id) # Calls Flask route in this file
        await ctx.send(f"Logout command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in logout_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Logout', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while logging out user `{user_id}`. Please try again later.")

@bot.command(name='Panic')
async def panic_user(ctx, user_id: str, redirect_url: str = "about:blank"):
    """Panics the user by redirecting their browser to a specified URL."""
    await ctx.send(f"Sending panic command for user `{user_id}` to redirect to `{redirect_url}`...")
    try:
        response = await website_send_command("/api/user/panic", user_id=user_id, url=redirect_url) # Calls Flask route in this file
        await ctx.send(f"Panic command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in panic_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Panic', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while panicking user `{user_id}`. Please try again later.")

@bot.command(name='ZoomControl')
async def zoom_control(ctx, user_id: str, level: int):
    """Controls the website zoom for the user (e.g., 100, 125, 75)."""
    if not 50 <= level <= 200:
        await ctx.send("Zoom level must be between 50 and 200 (as an integer percentage).")
        logger.warning(f"Invalid zoom level '{level}' for user '{user_id}' by {ctx.author}.", extra={'command_name': 'ZoomControl', 'user_id': user_id, 'user_name': str(ctx.author), 'level': level}); return
    await ctx.send(f"Setting zoom level for user `{user_id}` to `{level}%`...")
    try:
        response = await website_send_command("/api/user/zoom", user_id=user_id, level=level)
        await ctx.send(f"Zoom control command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in zoom_control command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ZoomControl', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting zoom for user `{user_id}`. Please try again later.")

@bot.command(name='ClearUpdates')
async def clear_updates(ctx, user_id: str):
    await ctx.send(f"Clearing update logs for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/clear_updates", user_id=user_id)
        await ctx.send(f"Clear updates command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_updates command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearUpdates', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing updates for user `{user_id}`. Please try again later.")

@bot.command(name='ClearNotifications')
async def clear_notifications(ctx, user_id: str):
    await ctx.send(f"Clearing notifications for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/clear_notifications", user_id=user_id)
        await ctx.send(f"Clear notifications command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_notifications command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearNotifications', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing notifications for user `{user_id}`. Please try again later.")

@bot.command(name='ClearActivity')
async def clear_activity(ctx, user_id: str):
    await ctx.send(f"Clearing activity logs for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/clear_activity", user_id=user_id)
        await ctx.send(f"Clear activity command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_activity command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearActivity', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing activity logs for user `{user_id}`. Please try again later.")

@bot.command(name='ClearError')
async def clear_error(ctx, user_id: str):
    await ctx.send(f"Clearing error logs for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/clear_errors", user_id=user_id)
        await ctx.send(f"Clear error command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_error command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearError', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing error logs for user `{user_id}`. Please try again later.")

@bot.command(name='ClearLoginHistory')
async def clear_login_history(ctx, user_id: str):
    await ctx.send(f"Clearing login history for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/clear_login_history", user_id=user_id)
        await ctx.send(f"Clear login history command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_login_history command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearLoginHistory', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing login history for user `{user_id}`. Please try again later.")

@bot.command(name='ClearAll')
@is_admin()
async def clear_all(ctx, user_id: str):
    await ctx.send(f"**WARNING:** Executing `ClearAll` for user `{user_id}`... This is irreversible. Confirm if you wish to proceed.")
    try:
        response = await website_send_command("/api/user/clear_all_data", user_id=user_id)
        await ctx.send(f"Clear All Data command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_all command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearAll', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing all data for user `{user_id}`. Please try again later.")

@bot.command(name='SetClicks')
async def set_clicks(ctx, user_id: str, count: int):
    await ctx.send(f"Setting clicks for user `{user_id}` to `{count}`...")
    try:
        response = await website_send_command("/api/user/set_clicks", user_id=user_id, count=count)
        await ctx.send(f"Set clicks command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_clicks command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SetClicks', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting clicks for user `{user_id}`. Please try again later.")

@bot.command(name='ClearClicks')
async def clear_clicks(ctx, user_id: str):
    await ctx.send(f"Clearing clicks for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/clear_clicks", user_id=user_id)
        await ctx.send(f"Clear clicks command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_clicks command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'ClearClicks', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing clicks for user `{user_id}`. Please try again later.")

@bot.command(name='Stats')
async def get_stats(ctx, user_id: str):
    await ctx.send(f"Fetching stats for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/api/users/{user_id}/stats")
        if response_data and response_data.get("status") == "success":
            stats_data = response_data.get("data", {})
            if stats_data:
                embed = discord.Embed(title=f"Statistics for {stats_data.get('username', user_id)}", color=0x9b59b6)
                embed.add_field(name="Total Clicks", value=stats_data.get('total_clicks', 'N/A'), inline=True)
                embed.add_field(name="Session Count", value=stats_data.get('session_count', 'N/A'), inline=True)
                embed.add_field(name="Avg. Session Time", value=stats_data.get('avg_session_time', 'N/A'), inline=True)
                embed.add_field(name="Errors Logged", value=stats_data.get('error_count', 'N/A'), inline=True)
                embed.add_field(name="Last Activity", value=stats_data.get('last_activity', 'N/A'), inline=False)
                await ctx.send(embed=embed)
            else: await ctx.send(f"No detailed stats found for user `{user_id}`.")
        else: await ctx.send(f"Could not retrieve stats for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_stats command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Stats', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching user stats for `{user_id}`. Please try again later.")

@bot.command(name='SessionTime')
async def get_session_time(ctx, user_id: str):
    await ctx.send(f"Fetching session time for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/api/users/{user_id}/session_time")
        if response_data and response_data.get("status") == "success":
            session_time = response_data.get("data", {}).get("current_session_time", "N/A")
            await ctx.send(f"Current session time for `{user_id}`: `{session_time}`.")
        else: await ctx.send(f"Could not retrieve session time for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_session_time command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SessionTime', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching session time for user `{user_id}`. Please try again later.")

@bot.command(name='SetAnnouncement')
async def set_announcement(ctx, user_id: str, *, message: str):
    await ctx.send(f"Setting announcement for user `{user_id}`: `{message}`...")
    try:
        response = await website_send_command("/api/user/set_announcement", user_id=user_id, message=message)
        await ctx.send(f"Set announcement command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_announcement command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SetAnnouncement', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting announcement for user `{user_id}`. Please try again later.")

@bot.command(name='Restart')
async def restart_user_page(ctx, user_id: str):
    await ctx.send(f"Restarting page for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/restart_page", user_id=user_id)
        await ctx.send(f"Restart page command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in restart_user_page command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Restart', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while restarting page for user `{user_id}`. Please try again later.")

@bot.command(name='Theme')
async def change_theme(ctx, user_id: str, theme_name: str):
    await ctx.send(f"Changing theme for user `{user_id}` to `{theme_name}`...")
    try:
        response = await website_send_command("/api/user/set_theme", user_id=user_id, theme=theme_name)
        await ctx.send(f"Change theme command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in change_theme command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Theme', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while changing theme for user `{user_id}`. Please try again later.")

@bot.command(name='Screenshot')
@is_admin()
async def screenshot_user(ctx, user_id: str):
    await ctx.send(f"Requesting screenshot for user `{user_id}`... This may take a moment.")
    try:
        response = await website_send_command("/api/user/screenshot", user_id=user_id)
        if response.get("status") == "success" and response.get("data", {}).get("image_url"):
            image_url = response["data"]["image_url"]
            await ctx.send(f"Screenshot for `{user_id}`:")
            embed = discord.Embed(title=f"Screenshot for {user_id}", color=0x3498db)
            embed.set_image(url=image_url)
            await ctx.send(embed=embed)
        else: await ctx.send(f"Screenshot request for `{user_id}` failed or returned no image URL. API Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in screenshot_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Screenshot', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An error occurred while requesting screenshot for user `{user_id}`. Please try again later.")

@bot.command(name='Notes')
async def get_user_notes(ctx, user_id: str):
    await ctx.send(f"Fetching notes for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/api/users/{user_id}/notes")
        if response_data and response_data.get("status") == "success":
            notes = response_data.get("data", {}).get("notes", "No notes found.")
            await ctx.send(f"Notes for `{user_id}`:\n>>> {notes}")
        else: await ctx.send(f"Could not retrieve notes for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_user_notes command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Notes', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching user notes for `{user_id}`. Please try again later.")

@bot.command(name='SetColor')
async def set_dashboard_color(ctx, user_id: str, hex_code: str):
    if not (hex_code.startswith('#') and len(hex_code) == 7 and all(c in '0123456789abcdefABCDEF' for c in hex_code[1:])):
        await ctx.send("Please provide a valid hex color code (e.g., `#1abc9c`).")
        logger.warning(f"Invalid hex color '{hex_code}' for user '{user_id}' by {ctx.author}.", extra={'command_name': 'SetColor', 'user_id': user_id, 'user_name': str(ctx.author), 'hex_code': hex_code}); return
    await ctx.send(f"Setting dashboard color for user `{user_id}` to `{hex_code}`...")
    try:
        response = await website_send_command("/api/user/set_dashboard_color", user_id=user_id, color=hex_code)
        await ctx.send(f"Set dashboard color command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_dashboard_color command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'SetColor', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting dashboard color for user `{user_id}`. Please try again later.")

@bot.command(name='Event')
async def set_custom_event(ctx, user_id: str, event_name: str, *, message: str = "N/A"):
    await ctx.send(f"Setting custom event `{event_name}` for user `{user_id}` with message: `{message}`...")
    try:
        response = await website_send_command("/api/user/set_event", user_id=user_id, event_name=event_name, message=message)
        await ctx.send(f"Set custom event command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_custom_event command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Event', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting custom event for user `{user_id}`. Please try again later.")

@bot.command(name='Sections')
async def control_sections(ctx, user_id: str, action: str, *, section_name: str):
    action = action.lower()
    if action not in ["remove", "enable"]: await ctx.send("Invalid action. Please use `remove` or `enable`."); logger.warning(f"Invalid section action '{action}' for user '{user_id}' by {ctx.author}.", extra={'command_name': 'Sections', 'user_id': user_id, 'user_name': str(ctx.author), 'action': action, 'section': section_name}); return
    await ctx.send(f"Attempting to `{action}` section `{section_name}` for user `{user_id}`...")
    try:
        response = await website_send_command("/api/user/control_section", user_id=user_id, action=action, section=section_name)
        await ctx.send(f"Section control command sent for user `{user_id}`. Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in control_sections command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Sections', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while controlling section for user `{user_id}`. Please try again later.")

@bot.command(name='Device')
async def get_device_info(ctx, user_id: str):
    await ctx.send(f"Fetching device information for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/api/users/{user_id}/device_info")
        if response_data and response_data.get("status") == "success":
            device_info = response_data.get("data", {})
            if device_info:
                embed = discord.Embed(title=f"Device Info for {user_id}", color=0xf1c40f)
                embed.add_field(name="User Agent", value=device_info.get('user_agent', 'N/A'), inline=False)
                embed.add_field(name="IP Address", value=device_info.get('ip_address', 'N/A'), inline=True)
                embed.add_field(name="Browser", value=device_info.get('browser', 'N/A'), inline=True)
                embed.add_field(name="Operating System", value=device_info.get('os', 'N/A'), inline=True)
                embed.add_field(name="Screen Resolution", value=device_info.get('screen_resolution', 'N/A'), inline=True)
                await ctx.send(embed=embed)
            else: await ctx.send(f"No device information found for user `{user_id}`.")
        else: await ctx.send(f"Could not retrieve device information for user `{user_id}`. API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_device_info command for user '{user_id}' by {ctx.author}: {e}", exc_info=True, extra={'command_name': 'Device', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching device info for user `{user_id}`. Please try again later.")


# --- Startup and Shutdown ---
def start_discord_bot_in_thread():
    """Runs the Discord bot in its own event loop within a new thread."""
    try:
        # Create new event loop for this thread (essential for thread safety)
        bot_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(bot_loop)
        
        # Don't let discord.py setup its own logger handler, we already have our custom ones.
        bot_loop.run_until_complete(bot.start(DISCORD_TOKEN)) 
    except discord.errors.LoginFailure as e:
        logger.critical(f"Discord Bot Login Failed in thread: Invalid Token. {e}", exc_info=True)
        # Attempt to notify the error channel if possible, then force exit
        asyncio.run_coroutine_threadsafe(
            _send_critical_notification_during_thread_failure("Discord Bot Thread Critical Error: Login Failure", str(e)), bot.loop)
        os._exit(1) # For a critical error in a non-main thread, force exit is often needed.
    except Exception as e:
        logger.critical(f"Discord bot thread crashed unexpectedly: {e}", exc_info=True)
        asyncio.run_coroutine_threadsafe(
            _send_critical_notification_during_thread_failure("Discord Bot Thread Critical Error: Unhandled Exception", str(e)), bot.loop)
        os._exit(1) # Force exit

async def _send_critical_notification_during_thread_failure(title, details):
    """Internal helper to attempt sending a critical Discord message during thread failure."""
    # This tries to send, but bot might not be connected or loop might be bad
    if ERROR_CHANNEL_ID != 0:
        error_channel = bot.get_channel(ERROR_CHANNEL_ID)
        if error_channel:
            embed = discord.Embed(
                title=title,
                description=f"```fix\n{details}\n```\nBot task in thread likely terminated.",
                color=discord.Color.dark_red(),
                timestamp=discord.utils.utcnow()
            )
            try:
                await error_channel.send(embed=embed)
            except Exception: # Ignore further exceptions if even sending fails
                pass


if __name__ == '__main__':
    if not DISCORD_TOKEN:
        logger.critical("DISCORD_TOKEN not found in environment variables. Bot cannot start. Exiting.")
        exit(1)

    # --- Start the Discord Bot in a Separate Thread ---
    # `daemon=True` means this thread will exit when the main process (Flask app) exits.
    logger.info("Starting Discord bot in a separate thread...")
    discord_bot_thread = Thread(target=start_discord_bot_in_thread, daemon=True) 
    discord_bot_thread.start()

    # --- Start the Flask Web App in the Main Thread ---
    # Render's Web Service expects the main process to handle the web server and keep the port open.
    try:
        logger.info(f"Starting Flask web app in MAIN thread on 0.0.0.0:{WEB_SERVER_PORT} for Render Web Service...")
        # Note: web_app.run() blocks. It should be the last call in the main thread.
        web_app.run(host='0.0.0.0', port=WEB_SERVER_PORT, debug=False, use_reloader=False)
    except Exception as e:
        logger.critical(f"An unhandled critical error occurred in the Flask web app (main thread) startup: {e}. Exiting.", exc_info=True)
        # Render will likely restart the service. Clean exit is sufficient.
        exit(1)
