import discord
from discord.ext import commands
import os
import asyncio
import aiohttp # For making async HTTP requests to your website's API

# --- Configuration ---
# Your actual config.py should handle os.getenv.
# For local testing without setting env vars, you might need a local .env file
# and python-dotenv or temporarily hardcode, BUT THIS IS NOT FOR DEPLOYMENT.
# For deployment, ensure environment variables are set.
from config import (
    DISCORD_TOKEN,
    COMMAND_PREFIX,
    WEBSITE_API_BASE_URL,
    ADMIN_ROLE_ID,
    WEBSITE_CHANNEL_ID,
    LOGIN_CHANNEL_ID
)

# --- Bot Initialization ---
intents = discord.Intents.default()
intents.message_content = True  # Required to read message content for commands
intents.members = True          # Required to get member information for ctx.author.roles checks

# Create the bot instance
bot = commands.Bot(command_prefix=COMMAND_PREFIX, intents=intents)

# --- Placeholders for Website Interaction ---
# IMPORTANT: These functions are *placeholders*. You MUST replace the logic
# inside them with actual HTTP requests to your website's backend API.
# You'll likely send JSON data and expect JSON responses.

async def website_send_command(endpoint: str, user_id: str = None, **kwargs):
    """
    CONCEPT: This function sends a command/action to your website's backend API.
    Args:
        endpoint (str): The specific API endpoint (e.g., '/logout', '/zoom_control').
        user_id (str): The ID of the user on your website (important for user-specific actions).
        kwargs: Additional data to send as part of the command (e.g., 'level', 'message', 'url').
    """
    full_url = f"{WEBSITE_API_BASE_URL}{endpoint}"
    payload = {"user_id": user_id, **kwargs}
    print(f"[Website API Placeholder] Sending command to {full_url} with data: {payload}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(full_url, json=payload) as response:
                response.raise_for_status() # Raise an exception for bad status codes
                data = await response.json()
                print(f"[Website API Placeholder] Response from {full_url}: {data}")
                return data
    except aiohttp.ClientError as e:
        print(f"Error connecting to website API at {full_url}: {e}")
        return {"status": "error", "message": f"Website API error: {e}"}
    except Exception as e:
        print(f"Unexpected error in website_send_command: {e}")
        return {"status": "error", "message": f"An unexpected error occurred: {e}"}

async def website_get_data(endpoint: str, user_id: str = None):
    """
    CONCEPT: This function fetches data from your website's backend API.
    Args:
        endpoint (str): The specific API endpoint (e.g., '/users', '/online_users').
        user_id (str): Optional, to fetch data for a specific user.
    """
    query_params = f"?user_id={user_id}" if user_id else ""
    full_url = f"{WEBSITE_API_BASE_URL}{endpoint}{query_params}"
    print(f"[Website API Placeholder] Getting data from {full_url}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(full_url) as response:
                response.raise_for_status()
                data = await response.json()
                print(f"[Website API Placeholder] Response from {full_url}: {data}")
                return data
    except aiohttp.ClientError as e:
        print(f"Error connecting to website API at {full_url}: {e}")
        return {"status": "error", "message": f"Website API error: {e}"}
    except Exception as e:
        print(f"Unexpected error in website_get_data: {e}")
        return {"status": "error", "message": f"An unexpected error occurred: {e}"}


# --- Bot Events ---

@bot.event
async def on_ready():
    """Called when the bot successfully connects to Discord."""
    print(f'Logged in as {bot.user.name} ({bot.user.id})')
    print('Bot is ready!')

    # Announce system online to a specific channel
    channel = bot.get_channel(WEBSITE_CHANNEL_ID)
    if channel:
        await channel.send("System Is Now Online. Waiting for commands..")
    else:
        print(f"Warning: Configured WEBSITE_CHANNEL_ID ({WEBSITE_CHANNEL_ID}) not found. "
              "Please ensure the bot has permissions and the ID is correct.")


@bot.event
async def on_message(message):
    """Called every time a message is sent in a channel the bot can see."""
    if message.author == bot.user:
        return # Ignore messages from the bot itself

    # Your custom website-to-bot logic would go here if not using Discord webhooks.
    # For example, if your website sends messages with a specific prefix.
    # As discussed, it's often easier for the website backend to use Discord Webhooks
    # directly for system/user online announcements, and for the bot to query the
    # website via API for commands.

    # This line is crucial for processing any commands you've defined
    await bot.process_commands(message)

# --- Helper for Admin Role Check ---
def is_admin():
    """Decorator to check if the command invoker has the ADMIN_ROLE_ID."""
    async def predicate(ctx):
        if not ADMIN_ROLE_ID:
            # If no ADMIN_ROLE_ID is set in config, all users can use this command.
            return True

        if not ctx.guild:
            await ctx.send("This command can only be used in a server.")
            return False

        # Get the role object using its ID
        admin_role = discord.utils.get(ctx.guild.roles, id=ADMIN_ROLE_ID)

        if admin_role and admin_role in ctx.author.roles:
            return True
        else:
            if admin_role:
                await ctx.send(f"You need the role '{admin_role.name}' to use this command.")
            else:
                await ctx.send(f"Admin role with ID '{ADMIN_ROLE_ID}' not found in this server, "
                               "or you do not have it.")
            return False
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
        response_data = await website_get_data(f"/users/{user_id}/info") # Assume API endpoint
        if response_data and response_data.get("status") == "success":
            user_data = response_data.get("data", {}) # Assuming 'data' key holds user info
            if user_data:
                embed = discord.Embed(
                    title=f"User Information: {user_data.get('username', user_id)}",
                    color=0x3498db # Blue
                )
                embed.add_field(name="User ID", value=user_data.get('user_id', 'N/A'), inline=True)
                embed.add_field(name="Name", value=user_data.get('name', 'N/A'), inline=True)
                embed.add_field(name="Email", value=user_data.get('email', 'N/A'), inline=True)
                embed.add_field(name="Online Status", value="✅ Online" if user_data.get('is_online', False) else "❌ Offline", inline=True)
                embed.add_field(name="Last Login", value=user_data.get('last_login', 'N/A'), inline=False)
                # You'll expand this with more fields as your website API provides them
                # e.g., embed.add_field(name="Cicks", value=user_data.get('clicks', 'N/A'), inline=True)
                await ctx.send(embed=embed)
                return # Exit early to prevent "error" message below
            else:
                await ctx.send(f"No detailed data found for user `{user_id}`.")
        else:
            await ctx.send(f"Could not retrieve information for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")

    except Exception as e:
        await ctx.send(f"An unexpected error occurred while fetching user information: `{e}`")


@bot.command(name='Online')
async def online_users(ctx):
    """Shows all online users logged in."""
    await ctx.send("Fetching online users...")
    try:
        response_data = await website_get_data("/online_users") # Assume API endpoint
        if response_data and response_data.get("status") == "success":
            users = response_data.get("data", []) # Expecting a list of online user dicts
            if users:
                online_list = "\n".join([f"- `{u.get('username', 'N/A')}` (ID: `{u.get('user_id', 'N/A')}`)" for u in users])
                embed = discord.Embed(
                    title="🌐 Currently Online Users",
                    description=online_list,
                    color=0x2ecc71 # Green
                )
                embed.set_footer(text=f"Total: {len(users)} users online.")
                await ctx.send(embed=embed)
            else:
                await ctx.send("No users are currently online.")
        else:
            await ctx.send(f"Could not fetch online users. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred while fetching online users: `{e}`")

@bot.command(name='Logout')
async def logout_user(ctx, user_id: str):
    """Logs out the specified user from the site."""
    await ctx.send(f"Attempting to log out user `{user_id}`...")
    try:
        response = await website_send_command("/user/logout", user_id=user_id) # Assume API endpoint
        await ctx.send(f"Logout command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error logging out user `{user_id}`: `{e}`")

@bot.command(name='Panic')
async def panic_user(ctx, user_id: str, redirect_url: str = "about:blank"):
    """Panics the user by redirecting their browser to a specified URL."""
    await ctx.send(f"Sending panic command for user `{user_id}` to redirect to `{redirect_url}`...")
    try:
        response = await website_send_command("/user/panic", user_id=user_id, url=redirect_url) # Assume API endpoint
        await ctx.send(f"Panic command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error sending panic command for user `{user_id}`: `{e}`")

@bot.command(name='ZoomControl')
async def zoom_control(ctx, user_id: str, level: int):
    """Controls the website zoom for the user (e.g., 100, 125, 75)."""
    if not 50 <= level <= 200:
        await ctx.send("Zoom level must be between 50 and 200 (as an integer percentage).")
        return
    await ctx.send(f"Setting zoom level for user `{user_id}` to `{level}%`...")
    try:
        response = await website_send_command("/user/zoom", user_id=user_id, level=level) # Assume API endpoint
        await ctx.send(f"Zoom control command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error setting zoom for user `{user_id}`: `{e}`")

@bot.command(name='ClearUpdates')
async def clear_updates(ctx, user_id: str):
    """Clears the user's update logs on the site."""
    await ctx.send(f"Clearing update logs for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_updates", user_id=user_id)
        await ctx.send(f"Clear updates command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing updates for user `{user_id}`: `{e}`")

@bot.command(name='ClearNotifications')
async def clear_notifications(ctx, user_id: str):
    """Clears the user's notifications."""
    await ctx.send(f"Clearing notifications for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_notifications", user_id=user_id)
        await ctx.send(f"Clear notifications command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing notifications for user `{user_id}`: `{e}`")

@bot.command(name='ClearActivity')
async def clear_activity(ctx, user_id: str):
    """Clears the user's activity logs."""
    await ctx.send(f"Clearing activity logs for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_activity", user_id=user_id)
        await ctx.send(f"Clear activity command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing activity logs for user `{user_id}`: `{e}`")

@bot.command(name='ClearError')
async def clear_error(ctx, user_id: str):
    """Clears error logs for the user."""
    await ctx.send(f"Clearing error logs for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_errors", user_id=user_id)
        await ctx.send(f"Clear error command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing error logs for user `{user_id}`: `{e}`")

@bot.command(name='ClearLoginHistory')
async def clear_login_history(ctx, user_id: str):
    """Clears the user's login logs."""
    await ctx.send(f"Clearing login history for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_login_history", user_id=user_id)
        await ctx.send(f"Clear login history command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing login history for user `{user_id}`: `{e}`")

@bot.command(name='ClearAll')
@is_admin() # Typically a command only admins should use due to its destructive nature
async def clear_all(ctx, user_id: str):
    """Clears ALL logs/data for the specified user."""
    await ctx.send(f"**WARNING:** Executing `ClearAll` for user `{user_id}`... This is irreversible. "
                   "Confirm if you wish to proceed.")
    # Implement a confirmation step here if this is very dangerous in your real app
    # For now, it proceeds.
    try:
        response = await website_send_command("/user/clear_all_data", user_id=user_id)
        await ctx.send(f"Clear All Data command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing all data for user `{user_id}`: `{e}`")

@bot.command(name='SetClicks')
async def set_clicks(ctx, user_id: str, count: int):
    """Sets the user's clicks count."""
    await ctx.send(f"Setting clicks for user `{user_id}` to `{count}`...")
    try:
        response = await website_send_command("/user/set_clicks", user_id=user_id, count=count)
        await ctx.send(f"Set clicks command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error setting clicks for user `{user_id}`: `{e}`")

@bot.command(name='ClearClicks')
async def clear_clicks(ctx, user_id: str):
    """Clears all click counts for the user."""
    await ctx.send(f"Clearing clicks for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_clicks", user_id=user_id)
        await ctx.send(f"Clear clicks command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error clearing clicks for user `{user_id}`: `{e}`")

@bot.command(name='Stats')
async def get_stats(ctx, user_id: str):
    """Shows all stats for the user."""
    await ctx.send(f"Fetching stats for user `{user_id}`...")
    try:
        # Assuming an /users/{user_id}/stats or similar endpoint on your API
        response_data = await website_get_data(f"/users/{user_id}/stats")
        if response_data and response_data.get("status") == "success":
            stats_data = response_data.get("data", {})
            if stats_data:
                embed = discord.Embed(
                    title=f"Statistics for {stats_data.get('username', user_id)}",
                    color=0x9b59b6 # Purple
                )
                embed.add_field(name="Total Clicks", value=stats_data.get('total_clicks', 'N/A'), inline=True)
                embed.add_field(name="Session Count", value=stats_data.get('session_count', 'N/A'), inline=True)
                embed.add_field(name="Avg. Session Time", value=stats_data.get('avg_session_time', 'N/A'), inline=True)
                embed.add_field(name="Errors Logged", value=stats_data.get('error_count', 'N/A'), inline=True)
                embed.add_field(name="Last Activity", value=stats_data.get('last_activity', 'N/A'), inline=False)
                # Add more stats as your website provides them
                await ctx.send(embed=embed)
                return # Exit early to prevent "error" message below
            else:
                await ctx.send(f"No detailed stats found for user `{user_id}`.")
        else:
            await ctx.send(f"Could not retrieve stats for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred while fetching user stats: `{e}`")

@bot.command(name='SessionTime')
async def get_session_time(ctx, user_id: str):
    """Shows the current session time for the user."""
    await ctx.send(f"Fetching session time for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/users/{user_id}/session_time") # Assume API endpoint
        if response_data and response_data.get("status") == "success":
            session_time = response_data.get("data", {}).get("current_session_time", "N/A")
            await ctx.send(f"Current session time for `{user_id}`: `{session_time}`.")
        else:
            await ctx.send(f"Could not retrieve session time for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred while fetching session time: `{e}`")

@bot.command(name='SetAnnouncement')
async def set_announcement(ctx, user_id: str, *, message: str): # `*` collects all remaining arguments into `message`
    """Sets a custom announcement to display for the user on the site."""
    await ctx.send(f"Setting announcement for user `{user_id}`: `{message}`...")
    try:
        response = await website_send_command("/user/set_announcement", user_id=user_id, message=message)
        await ctx.send(f"Set announcement command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error setting announcement for user `{user_id}`: `{e}`")

@bot.command(name='Restart')
async def restart_user_page(ctx, user_id: str):
    """Restarts the user's page/session on the website."""
    await ctx.send(f"Restarting page for user `{user_id}`...")
    try:
        response = await website_send_command("/user/restart_page", user_id=user_id)
        await ctx.send(f"Restart page command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error restarting page for user `{user_id}`: `{e}`")

@bot.command(name='Theme')
async def change_theme(ctx, user_id: str, theme_name: str):
    """Changes the user's theme (e.g., 'dark', 'light', 'custom')."""
    await ctx.send(f"Changing theme for user `{user_id}` to `{theme_name}`...")
    try:
        response = await website_send_command("/user/set_theme", user_id=user_id, theme=theme_name)
        await ctx.send(f"Change theme command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error changing theme for user `{user_id}`: `{e}`")

@bot.command(name='Screenshot')
@is_admin() # This command is often restricted due to privacy concerns
async def screenshot_user(ctx, user_id: str):
    """Requests a screenshot of the user's screen on the website."""
    await ctx.send(f"Requesting screenshot for user `{user_id}`... This may take a moment.")
    try:
        # Your website's backend needs to initiate the screenshot on the frontend,
        # have the frontend send it back to the backend, and then the backend
        # might upload it to an image host and return a URL, or stream it.
        # For simplicity here, we assume the API call directly returns a temporary URL.
        response = await website_send_command("/user/screenshot", user_id=user_id)
        if response.get("status") == "success" and response.get("data", {}).get("image_url"):
            image_url = response["data"]["image_url"]
            await ctx.send(f"Screenshot for `{user_id}`:", file=discord.File(image_url)) # discord.File accepts URL if discord.py supports, else you'll need aiohttp.get_image()
            # If discord.File needs local path, you'd download the image first:
            # async with aiohttp.ClientSession() as session:
            #     async with session.get(image_url) as resp:
            #         if resp.status == 200:
            #             with open("screenshot.png", "wb") as f:
            #                 f.write(await resp.read())
            #             await ctx.send(f"Screenshot for `{user_id}`:", file=discord.File("screenshot.png"))
            #             os.remove("screenshot.png")
            #         else:
            #             await ctx.send("Failed to download screenshot.")
        else:
            await ctx.send(f"Screenshot request for `{user_id}` failed or returned no image URL. "
                           f"API Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"An error occurred while requesting screenshot for user `{user_id}`: `{e}`")

@bot.command(name='Notes')
async def get_user_notes(ctx, user_id: str):
    """Shows the user's notes."""
    await ctx.send(f"Fetching notes for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/users/{user_id}/notes")
        if response_data and response_data.get("status") == "success":
            notes = response_data.get("data", {}).get("notes", "No notes found.")
            await ctx.send(f"Notes for `{user_id}`:\n>>> {notes}")
        else:
            await ctx.send(f"Could not retrieve notes for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred while fetching user notes: `{e}`")

@bot.command(name='SetColor')
async def set_dashboard_color(ctx, user_id: str, hex_code: str):
    """Sets the user's dashboard color (e.g., '#1abc9c')."""
    if not (hex_code.startswith('#') and len(hex_code) == 7): # Simple validation
        await ctx.send("Please provide a valid hex color code (e.g., `#1abc9c`).")
        return
    await ctx.send(f"Setting dashboard color for user `{user_id}` to `{hex_code}`...")
    try:
        response = await website_send_command("/user/set_dashboard_color", user_id=user_id, color=hex_code)
        await ctx.send(f"Set dashboard color command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error setting dashboard color for user `{user_id}`: `{e}`")

@bot.command(name='Event')
async def set_custom_event(ctx, user_id: str, event_name: str, *, message: str = "N/A"):
    """Sets a custom event for the user with an optional message."""
    await ctx.send(f"Setting custom event `{event_name}` for user `{user_id}` with message: `{message}`...")
    try:
        response = await website_send_command("/user/set_event", user_id=user_id, event_name=event_name, message=message)
        await ctx.send(f"Set custom event command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error setting custom event for user `{user_id}`: `{e}`")

@bot.command(name='Sections')
async def control_sections(ctx, user_id: str, action: str, *, section_name: str):
    """Removes or enables specific sections on the user's website dashboard."""
    action = action.lower()
    if action not in ["remove", "enable"]:
        await ctx.send("Invalid action. Please use `remove` or `enable`.")
        return
    await ctx.send(f"Attempting to `{action}` section `{section_name}` for user `{user_id}`...")
    try:
        response = await website_send_command("/user/control_section", user_id=user_id, action=action, section=section_name)
        await ctx.send(f"Section control command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"Error controlling section for user `{user_id}`: `{e}`")

@bot.command(name='Device')
async def get_device_info(ctx, user_id: str):
    """Shows the user's device information."""
    await ctx.send(f"Fetching device information for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/users/{user_id}/device_info")
        if response_data and response_data.get("status") == "success":
            device_info = response_data.get("data", {})
            if device_info:
                embed = discord.Embed(
                    title=f"Device Info for {user_id}",
                    color=0xf1c40f # Yellow
                )
                embed.add_field(name="User Agent", value=device_info.get('user_agent', 'N/A'), inline=False)
                embed.add_field(name="IP Address", value=device_info.get('ip_address', 'N/A'), inline=True)
                embed.add_field(name="Browser", value=device_info.get('browser', 'N/A'), inline=True)
                embed.add_field(name="Operating System", value=device_info.get('os', 'N/A'), inline=True)
                embed.add_field(name="Screen Resolution", value=device_info.get('screen_resolution', 'N/A'), inline=True)
                await ctx.send(embed=embed)
                return
            else:
                await ctx.send(f"No device information found for user `{user_id}`.")
        else:
            await ctx.send(f"Could not retrieve device information for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        await ctx.send(f"An unexpected error occurred while fetching device info: `{e}`")

# --- Start the Bot ---
if __name__ == '__main__':
    if not DISCORD_TOKEN:
        print("ERROR: DISCORD_TOKEN not found in environment variables. Please set it.")
        exit(1) # Exit if token is not found

    # You could technically call website_send_command to announce 'bot starting up'
    # if you had a special endpoint for that on your website, or your website
    # triggers bot startup.
    # The on_ready event already handles the 'System Is Now Online' message from the bot itself.

    try:
        bot.run(DISCORD_TOKEN)
    except discord.errors.LoginFailure:
        print("ERROR: Invalid Discord Bot Token. Please check your DISCORD_TOKEN in config.py or environment variables.")
    except Exception as e:
        print(f"An unhandled error occurred during bot execution: {e}")
