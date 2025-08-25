# config.py
import os

# --- Discord Bot Configuration ---
# Your Discord Bot Token - Must be set as an environment variable named "DISCORD_TOKEN"
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# Bot's command prefix (e.g., .help, !commands)
COMMAND_PREFIX = os.getenv("COMMAND_PREFIX", ".")

# --- Discord Channel IDs ---
# These variables will attempt to read from environment variables.
# If an environment variable is not found (e.g., in local testing without a .env file),
# it will use the hardcoded default ID provided here.
# For DEPLOYMENT, it is CRITICAL that you set environment variables on your hosting platform
# with keys matching the first argument (e.g., "WEBSITE_CHANNEL_ID") and the value as the ID.

# Channel ID for 'System Is Now Online' announcements (from the bot when it starts up)
WEBSITE_CHANNEL_ID = int(os.getenv("WEBSITE_CHANNEL_ID", "1409339938427637811"))

# Channel ID for '(user) Has Been Connected' announcements
LOGIN_CHANNEL_ID = int(os.getenv("LOGIN_CHANNEL_ID", "1409340483255144608"))

# Channel ID for '(user) Has Been Disconnected' announcements
DISCONNECTED_CHANNEL_ID = int(os.getenv("DISCONNECTED_CHANNEL_ID", "1409350070326792293"))

# Channel for general bot operational logs and command invocations
LOGGING_CHANNEL_ID = int(os.getenv("LOGGING_CHANNEL_ID", "1409340101825265704"))

# Channel for reporting critical errors and unhandled exceptions
ERROR_CHANNEL_ID = int(os.getenv("ERROR_CHANNEL_ID", "1409349720928948244"))

# --- Role ID for Admin Commands (Optional) ---
# This will read the ADMIN_ROLE_ID environment variable.
ADMIN_ROLE_ID_STR = os.getenv("ADMIN_ROLE_ID")
ADMIN_ROLE_ID = int(ADMIN_ROLE_ID_STR) if ADMIN_ROLE_ID_STR and ADMIN_ROLE_ID_STR.isdigit() else None

# --- Your Website API Configuration ---
# This variable will read the WEBSITE_API_BASE_URL environment variable.
# Example: https://your-custom-site.com/api
WEBSITE_API_BASE_URL = os.getenv("WEBSITE_API_BASE_URL", "http://localhost:5000/api")

# --- Debugging (for local use only, should not be active in production) ---
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"
