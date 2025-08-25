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
WEBSITE_CHANNEL_ID = int(os.getenv("WEBSITE_CHANNEL_ID", "0")) # Channel for system online announcements
LOGIN_CHANNEL_ID = int(os.getenv("LOGIN_CHANNEL_ID", "0"))     # Channel for user login announcements

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
# You can set this via environment variable if you want, or remove.
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true"
