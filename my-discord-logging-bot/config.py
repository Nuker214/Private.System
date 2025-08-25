# config.py
import os

# --- Discord Bot Configuration ---
# Your Discord Bot Token - Must be set as an environment variable
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")

# Bot's command prefix (e.g., .help, !commands)
COMMAND_PREFIX = os.getenv("COMMAND_PREFIX", ".")

# --- Discord Channel IDs ---
# Get these by enabling Discord Developer Mode (User Settings -> Advanced),
# then right-click a channel -> Copy ID. Must be set as environment variables.

# Channel ID for 'System Is Now Online' announcements (from the bot when it starts up)
WEBSITE_CHANNEL_ID = int(os.getenv("1409339938427637811", "0"))

# Channel ID for '(user) Has Been Connected' announcements (if your website sends to Discord directly, or via bot method)
LOGIN_CHANNEL_ID = int(os.getenv("1409340483255144608", "0"))

# Channel ID for '(user) Has Been disconnected' announcements (if your website sends to Discord directly, or via bot method)
DISCONNECTED_CHANNEL_ID = int(os.getenv("1409350070326792293", "0"))

# --- NEW: Channel for general bot operational logs and command invocations ---
LOGGING_CHANNEL_ID = int(os.getenv("1409340101825265704", "0"))

# --- NEW: Channel for reporting critical errors and unhandled exceptions ---
ERROR_CHANNEL_ID = int(os.getenv("1409349720928948244", "0"))

# --- Role ID for Admin Commands (Optional) ---
# Get by right-clicking a role -> Copy ID.
# Set as environment variable if you want to restrict commands to an admin role.
ADMIN_ROLE_ID_STR = os.getenv("ADMIN_ROLE_ID")
ADMIN_ROLE_ID = int(ADMIN_ROLE_ID_STR) if ADMIN_ROLE_ID_STR and ADMIN_ROLE_ID_STR.isdigit() else None

# --- Your Website API Configuration ---
# This is the base URL for your *deployed* website's backend API.
# Your bot will send requests to this URL for most commands (e.g., "https://yourwebsite.com/api").
# This must also be set as an environment variable during deployment.
WEBSITE_API_BASE_URL = os.getenv("WEBSITE_API_BASE_URL", "http://localhost:5000/api")

# --- Debugging (for local use only, should not be active in production) ---
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"






