import os
if os.getenv("IGNORE_DISCORD_VOICE") == "true":
    import discord
else:
    # Fallback to ignore voice, which triggers audioop
    import discord # Still import it, but rely on underlying library's conditional logic
    # For a truly minimal approach: from discord.ext import commands, etc.
    # However, a common workaround for this exact error involves the ffmpeg dependency,
    # but you don't use it, and the simple Python 3.10 is expected to fix.
    # If Discord.py's internal structure always loads VoiceClient for standard init,
    # the simplest reliable fix if version is ignored:
    pass # We will rely on environment flag in Run command

# Let's revert to a slightly different way.
# The `audioop` module is a *builtin* module and Discord.py relies on it being available.
# If Render's 3.13 doesn't have it, changing Python version IS the only direct solution.

# Instead of conditionally importing discord (which is tricky to do right globally),
# let's try the *environment variable approach to suppress discord.py's voice load*.

# Load environment variables
load_dotenv()
DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
PUBLIC_FLASK_BACKEND_URL = os.getenv("PUBLIC_FLASK_BACKEND_URL")
# SITE_GENERAL_ACTIVITY_WEBHOOK_URL is for Flask backend. Bot uses ctx.send() for user replies.
# No direct webhook calls from bot.py
BOT_STATUS_CHANNEL_ID = int(os.getenv("BOT_STATUS_CHANNEL_ID")) # The "nothing-here" channel ID

# Configure Discord Intents (essential for bot to function)
# Minimal recommended intents for this bot:
intents = discord.Intents.default()
intents.message_content = True  # Required to read command arguments
intents.members = True          # For potential member management (if expanded)
intents.presences = True        # To potentially track user status, though not used here directly

# Create the bot instance
bot = commands.Bot(command_prefix=".", intents=intents)

# --- Discord Bot Events ---
@bot.event
async def on_ready():
    """Event that fires when the bot successfully connects to Discord."""
    print(f'Logged in as {bot.user} (ID: {bot.user.id})')
    print('Bot is ready!')

    # Send "System Is Now Online." message to a specific channel
    if BOT_STATUS_CHANNEL_ID:
        # Use a short delay to ensure Discord's cache is populated
        await asyncio.sleep(1) 
        status_channel = bot.get_channel(BOT_STATUS_CHANNEL_ID)
        if status_channel:
            embed = discord.Embed(
                title="System Status Update",
                description="System Is Now Online. Waiting for commands..",
                color=discord.Color.green()
            )
            embed.set_footer(text=f"{bot.user.name} online.")
            try:
                await status_channel.send(embed=embed)
            except discord.Forbidden:
                print(f"ERROR: Bot does not have permissions to send messages or embed links to channel '{status_channel.name}' (ID: {BOT_STATUS_CHANNEL_ID}). Please check bot permissions.")
            except Exception as e:
                print(f"ERROR sending online message to Discord channel: {e}")
        else:
            print(f"Warning: BOT_STATUS_CHANNEL_ID ({BOT_STATUS_CHANNEL_ID}) is valid but the channel object was not found (or bot lacks visibility). Could not send online message.")
    else:
        print("ERROR: BOT_STATUS_CHANNEL_ID not set in .env. Bot online status will not be posted.")


# --- Helper to send commands to the Flask Backend ---
def send_command_to_backend(target_username: str, command: str, args: dict = None):
    """Sends an HTTP POST request to the Flask backend's command API."""
    if not PUBLIC_FLASK_BACKEND_URL or PUBLIC_FLASK_BACKEND_URL == "YOUR_RENDER_SERVICE_PUBLIC_URL":
        print("Error: PUBLIC_FLASK_BACKEND_URL is not correctly set in .env. Cannot send commands.")
        return {"status": "error", "message": "Backend URL not configured or is a placeholder."}

    backend_command_url = f"{PUBLIC_FLASK_BACKEND_URL}/api/discord-command"
    if args is None:
        args = {}

    payload = {
        "target_username": target_username,
        "command": command,
        "args": args
    }
    headers = {"Content-Type": "application/json"}
    try:
        response = requests.post(backend_command_url, data=json.dumps(payload), headers=headers)
        response.raise_for_status()  # Raise an exception for HTTP errors
        print(f"Command '{command}' sent for '{target_username}'. Response: {response.json()}")
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error sending command '{command}' to backend for '{target_username}': {e}")
        return {"status": "error", "message": str(e)}

# --- Discord Bot Commands ---
@bot.command(name="help", description="Shows available commands.")
async def help_command(ctx):
    """Shows all available commands and their descriptions."""
    help_text = (
        "**Available Commands for Website Interaction:**\n"
        "`  .Information <user>`: Gets various client-side information about the user.\n"
        "`  .Online`: Shows all online users currently logged into the site.\n"
        "`  .Logout <user>`: Logs out the specified user from the site.\n"
        "`  .Panic <user> [url]`: Redirects the user's browser to 'clever.com' or a custom URL.\n"
        "`  .ZoomControl <user> <level>`: Adjusts the website zoom for the user (e.g., `0.1` for zoom in, `-0.1` for zoom out, `1.0` for reset to 100%).\n"
        "`  .ClearUpdates <user>`: Clears the user's system update messages on their dashboard.\n"
        "`  .ClearNotifications <user>`: Clears all current notifications shown on the user's dashboard.\n"
        "`  .ClearActivity <user>`: Clears the user's activity logs.\n"
        "`  .ClearError <user>`: Clears the user's error logs.\n"
        "`  .ClearLoginHistory <user>`: Clears the user's local login history.\n"
        "`  .ClearAll <user>`: Clears all local user-specific data (logs, notes, clicks, etc.) and restarts their page.\n"
        "`  .SetClicks <user> <number>`: Sets the mouse click counter for the user.\n"
        "`  .ClearClicks <user>`: Resets the user's mouse click counter to 0.\n"
        "`  .Stats <user>`: Retrieves current usage statistics for the user.\n"
        "`  .SessionTime <user>`: Gets the current session uptime for the user.\n"
        "`  .SetAnnouncement <user> <message>`: Sets a custom announcement on the user's dashboard (marquee text).\n"
        "`  .Restart <user>`: Forces a full restart (page reload) for the user's session.\n"
        "`  .Theme <user> <dark|light|orange|blue|green|red|purple|amber|teal|pink>`: Changes the user's overall theme or sets an accent color.\n"
        "`  .Screenshot <user>`: Takes a screenshot of the user's active screen/browser viewport.\n"
        "`  .Notes <user>`: Retrieves the user's saved text notes.\n"
        "`  .SetColor <user> <hex_color>`: Sets a custom hex color (e.g., `#FF0000`) as the user's dashboard accent color.\n"
        "`  .Event <user> <YYYY-MM-DD> <HH:MM> <description>`: Adds a custom event to the user's important dates calendar.\n"
        "`  .Sections <user> <show|hide>`: Toggles the visibility of the main dashboard sections.\n"
        "`  .Device <user>`: Retrieves detailed device and OS information for the user.\n\n"
        "*Responses to data-gathering commands will be sent to the configured general activity webhook.*"
    )
    embed = discord.Embed(
        title="Logging Information Bot Help",
        description=help_text,
        color=discord.Color.blue()
    )
    await ctx.send(embed=embed)

@bot.command(name="Information", description="Shows comprehensive information about a specific user.")
async def info_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "get_information")
    if response.get("status") == "success":
        await ctx.send(f"Requested information for user `{target_username}`. Check the general activity webhook for full details.")
    else:
        await ctx.send(f"Failed to get information for user `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Online", description="Shows all online users.")
async def show_online_users(ctx):
    try:
        if not PUBLIC_FLASK_BACKEND_URL or PUBLIC_FLASK_BACKEND_URL == "YOUR_RENDER_SERVICE_PUBLIC_URL":
            return await ctx.send("Error: Backend URL is not correctly configured in .env. Cannot fetch online users.")
        flask_online_url = f"{PUBLIC_FLASK_BACKEND_URL}/api/online-users"
        response = requests.get(flask_online_url)
        response.raise_for_status()
        online_users_data = response.json()
        online_usernames = [u['username'] for u in online_users_data.get('online_users', [])]
        if online_usernames:
            await ctx.send(f"**Currently Online Users:** {', '.join(online_usernames)}")
        else:
            await ctx.send("No users currently online.")
    except requests.exceptions.RequestException as e:
        await ctx.send(f"Failed to fetch online users from backend: {e}")

@bot.command(name="Logout", description="Logs out a user from the site.")
async def logout_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "logout_user")
    if response.get("status") == "success":
        await ctx.send(f"Logout command sent to `{target_username}`. User will be prompted to confirm, or be forcefully logged out depending on client-side implementation.")
    else:
        await ctx.send(f"Failed to send logout command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Panic", description="Redirects a user to a custom site or clever.com.")
async def panic_user(ctx, target_username: str, url: str = "https://clever.com"):
    response = send_command_to_backend(target_username, "panic_user", {"url": url})
    if response.get("status") == "success":
        await ctx.send(f"Panic command sent to `{target_username}`. User will be redirected to: `{url}`.")
    else:
        await ctx.send(f"Failed to send panic command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ZoomControl", description="Controls website zoom for a user (e.g., 0.1, -0.1, 1.0).")
async def zoom_control_user(ctx, target_username: str, level: float):
    response = send_command_to_backend(target_username, "zoom_control", {"level": level})
    if response.get("status") == "success":
        await ctx.send(f"Zoom control command sent to `{target_username}`. Adjusting by: `{level}` (0.1 increments, 1.0 resets).")
    else:
        await ctx.send(f"Failed to send zoom control command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearUpdates", description="Clears user's system update messages.")
async def clear_updates_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_updates")
    if response.get("status") == "success":
        await ctx.send(f"Clear updates command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear updates command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearNotifications", description="Clears user's notifications.")
async def clear_notifications_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_notifications")
    if response.get("status") == "success":
        await ctx.send(f"Clear notifications command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear notifications command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearActivity", description="Clears user's activity logs.")
async def clear_activity_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_activity")
    if response.get("status") == "success":
        await ctx.send(f"Clear activity logs command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear activity logs command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearError", description="Clears user's error logs.")
async def clear_error_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_error")
    if response.get("status") == "success":
        await ctx.send(f"Clear error logs command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear error logs command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearLoginHistory", description="Clears user's login history.")
async def clear_login_history_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_login_history")
    if response.get("status") == "success":
        await ctx.send(f"Clear login history command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear login history command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearAll", description="Clears all user data.")
async def clear_all_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_all")
    if response.get("status") == "success":
        await ctx.send(f"Clear all local data and restart page command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear all data command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="SetClicks", description="Sets the click counter for a user.")
async def set_clicks_user(ctx, target_username: str, count: int):
    response = send_command_to_backend(target_username, "set_clicks", {"count": count})
    if response.get("status") == "success":
        await ctx.send(f"Set clicks command sent to `{target_username}`. Setting count to `{count}`.")
    else:
        await ctx.send(f"Failed to send set clicks command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="ClearClicks", description="Clears the click counter for a user.")
async def clear_clicks_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "clear_clicks")
    if response.get("status") == "success":
        await ctx.send(f"Clear clicks command sent to `{target_username}`.")
    else:
        await ctx.send(f"Failed to send clear clicks command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Stats", description="Shows statistics for a user.")
async def stats_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "get_stats")
    if response.get("status") == "success":
        await ctx.send(f"Requested stats for user `{target_username}`. Check the general activity webhook for details.")
    else:
        await ctx.send(f"Failed to get stats for user `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="SessionTime", description="Shows the session time for a user.")
async def session_time_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "get_session_time")
    if response.get("status") == "success":
        await ctx.send(f"Requested session time for user `{target_username}`. Check the general activity webhook for details.")
    else:
        await ctx.send(f"Failed to get session time for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="SetAnnouncement", description="Sets a custom announcement on the user's dashboard.")
async def set_announcement_user(ctx, target_username: str, *, message: str): # Using * to consume rest of the message
    response = send_command_to_backend(target_username, "set_announcement", {"message": message})
    if response.get("status") == "success":
        await ctx.send(f"Set announcement command sent to `{target_username}`: `{message}`.")
    else:
        await ctx.send(f"Failed to send set announcement command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Restart", description="Restarts a user's page.")
async def restart_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "restart_page")
    if response.get("status") == "success":
        await ctx.send(f"Restart page command sent to `{target_username}`. The user's page will reload.")
    else:
        await ctx.send(f"Failed to send restart page command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Theme", description="Changes the user's dashboard theme.")
async def change_theme_user(ctx, target_username: str, theme: str):
    valid_themes = ["dark", "light", "orange", "blue", "green", "red", "purple", "amber", "teal", "pink"]
    if theme.lower() not in valid_themes:
        return await ctx.send(f"Invalid theme. Choose from: {', '.join(valid_themes)}")

    if theme.lower() in ["dark", "light"]:
        command = "toggle_theme"
        args = {"mode": theme.lower()}
    else: # This assumes "theme" implies "accent_color" if it's not dark/light
        command = "set_accent_theme"
        args = {"color": theme.lower()}

    response = send_command_to_backend(target_username, command, args)
    if response.get("status") == "success":
        await ctx.send(f"Change theme command sent to `{target_username}`. Setting to `{theme}`.")
    else:
        await ctx.send(f"Failed to send change theme command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Screenshot", description="Takes a screenshot of the user's screen.")
async def screenshot_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "take_screenshot")
    if response.get("status") == "success":
        await ctx.send(f"Requested screenshot for user `{target_username}`. Check the general activity webhook for the image.")
    else:
        await ctx.send(f"Failed to send screenshot command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Notes", description="Shows the user's text notes.")
async def notes_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "get_text_notes")
    if response.get("status") == "success":
        await ctx.send(f"Requested notes for user `{target_username}`. Check the general activity webhook for content.")
    else:
        await ctx.send(f"Failed to send get notes command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="SetColor", description="Sets the user's dashboard accent color (e.g., #FF0000).")
async def set_color_user(ctx, target_username: str, hex_color: str):
    # Basic validation for hex color format
    import re
    if not re.match(r"^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$", hex_color):
        return await ctx.send("Invalid hex color format. Use `#RRGGBB` or `#RGB` (e.g., `#FF0000` for red).")
    
    response = send_command_to_backend(target_username, "set_custom_color", {"color": hex_color})
    if response.get("status") == "success":
        await ctx.send(f"Set custom color command sent to `{target_username}`. Setting color to `{hex_color}`.")
    else:
        await ctx.send(f"Failed to send set color command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Event", description="Adds a custom calendar event for the user.")
async def set_event_user(ctx, target_username: str, date: str, time: str, *, description: str):
    # Basic validation for date and time format (YYYY-MM-DD HH:MM)
    event_datetime_str = f"{date}T{time}"
    try:
        from datetime import datetime
        datetime.fromisoformat(event_datetime_str) # Will raise ValueError for invalid format
    except ValueError:
        return await ctx.send("Invalid date or time format. Use `YYYY-MM-DD` for date and `HH:MM` for time (e.g., `.Event <user> 2025-08-24 14:30 Your event description`).")

    response = send_command_to_backend(target_username, "set_custom_event", {
        "date": date,
        "time": time,
        "description": description
    })
    if response.get("status") == "success":
        await ctx.send(f"Set event command sent to `{target_username}` for `{date} {time}` with description: `{description}`.")
    else:
        await ctx.send(f"Failed to send set event command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Sections", description="Toggles the visibility of dashboard sections.")
async def toggle_sections_user(ctx, target_username: str, action: str):
    if action.lower() not in ["show", "hide"]:
        return await ctx.send("Invalid action. Use `show` or `hide`.")

    response = send_command_to_backend(target_username, "toggle_sections", {"action": action.lower()})
    if response.get("status") == "success":
        await ctx.send(f"Toggle sections command sent to `{target_username}`. Action: `{action}`.")
    else:
        await ctx.send(f"Failed to send toggle sections command for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")

@bot.command(name="Device", description="Shows the user's device information.")
async def device_user(ctx, target_username: str):
    response = send_command_to_backend(target_username, "get_device_info")
    if response.get("status") == "success":
        await ctx.send(f"Requested device information for user `{target_username}`. Check the general activity webhook for details.")
    else:
        await ctx.send(f"Failed to send device information request for `{target_username}`: {response.get('message', 'User might be offline or command failed.')}")


# Run the bot
if DISCORD_BOT_TOKEN and DISCORD_BOT_TOKEN != "YOUR_DISCORD_BOT_TOKEN_HERE":
    bot.run(DISCORD_BOT_TOKEN)
else:
    print("ERROR: DISCORD_BOT_TOKEN not found or is a placeholder in .env file. Bot cannot run.")
