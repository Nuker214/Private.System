import discord
from discord.ext import commands
import os
import asyncio
import aiohttp
import logging
import traceback

# --- Configuration (Imports all channel IDs, including DISCONNECTED_CHANNEL_ID) ---
from config import (
    DISCORD_TOKEN,
    COMMAND_PREFIX,
    WEBSITE_API_BASE_URL,
    ADMIN_ROLE_ID,
    WEBSITE_CHANNEL_ID,      # For 'System Is Now Online'
    LOGIN_CHANNEL_ID,        # For 'User Has Connected' (via website's trigger)
    DISCONNECTED_CHANNEL_ID, # For 'User Has Disconnected' (via website's trigger)
    LOGGING_CHANNEL_ID,      # For general bot operational logs and command invocations
    ERROR_CHANNEL_ID         # For critical errors and unhandled exceptions
)

# --- Custom Discord Logging Handler ---
class DiscordHandler(logging.Handler):
    """
    A custom logging handler that sends log records to a specific Discord channel.
    It formats ERROR/CRITICAL logs into embeds for better visibility.
    """
    def __init__(self, bot_instance, channel_id, level=logging.NOTSET):
        super().__init__(level)
        self.bot = bot_instance
        self.channel_id = channel_id
        # Ensure the formatter is set on the handler for string formatting if no embed is used.
        # However, for ERROR/CRITICAL, we'll build embeds dynamically.
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
        # Pass the original record to retain all its attributes
        self.bot.loop.create_task(self.send_to_discord(channel, record))

    async def send_to_discord(self, channel, record):
        try:
            # Use extra attributes for better embed fields
            guild_info = record.guild_name if hasattr(record, 'guild_name') else "N/A"
            channel_info = record.channel_name if hasattr(record, 'channel_name') else "N/A"
            user_info = f"{record.user_name} (ID: {record.user_id})" if hasattr(record, 'user_name') else "N/A"
            command_info = record.command_name if hasattr(record, 'command_name') else "N/A"
            full_command_info = record.full_command if hasattr(record, 'full_command') else "N/A"


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
                if command_info != "N/A":
                    embed.add_field(name="Command", value=command_info, inline=True)
                if user_info != "N/A":
                    embed.add_field(name="User", value=user_info, inline=True)
                if full_command_info != "N/A":
                     embed.add_field(name="Full Command", value=f"`{full_command_info}`", inline=False)


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
                if user_info != "N/A":
                    embed.add_field(name="User", value=user_info, inline=True)
                await channel.send(embed=embed)

            elif record.levelname == 'INFO':
                # General info logs as a simple message to reduce embed spam in busy log channels
                await channel.send(f"[`{record.asctime.split(',')[0]} INFO`] {record.message}") # Simple time and message

            else:
                await channel.send(f"[{record.levelname}] {record.message}") # Fallback for other levels
        except discord.Forbidden:
            print(f"[{self.__class__.__name__}] ERROR: Missing permissions for Discord channel '{channel.name}' (ID: {channel.id}). Cannot send log.")
        except discord.HTTPException as e:
            print(f"[{self.__class__.__name__}] ERROR: Failed to send log to Discord channel '{channel.name}' (ID: {channel.id}) - HTTP error {e.status}: {e.text}")
        except Exception as e:
            print(f"[{self.__class__.__name__}] CRITICAL: Unexpected error when trying to send log to Discord: {e}", exc_info=True)


# --- Bot Initialization ---
intents = discord.Intents.default()
intents.message_content = True
intents.members = True

bot = commands.Bot(command_prefix=COMMAND_PREFIX, intents=intents)


# --- Setup Logging ---
logger = logging.getLogger('discord_bot')
logger.setLevel(logging.INFO) # Set the minimum level for file and console handlers

# Standard console handler for real-time output where bot is running
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(console_handler)

# File handler for persistent local logs
file_handler = logging.FileHandler('bot.log', encoding='utf-8')
file_handler.setFormatter(logging.Formatter('%(asctime)s:%(levelname)s:%(name)s: %(message)s'))
logger.addHandler(file_handler)

# Add Discord Handlers - only if valid Channel IDs are provided in config
if LOGGING_CHANNEL_ID != 0:
    discord_log_handler = DiscordHandler(bot, LOGGING_CHANNEL_ID, level=logging.INFO) # General INFO, WARNING logs to this
    logger.addHandler(discord_log_handler)
else:
    logger.warning("LOGGING_CHANNEL_ID not set or is 0. General bot activity will not be logged to Discord.")

if ERROR_CHANNEL_ID != 0:
    discord_error_handler = DiscordHandler(bot, ERROR_CHANNEL_ID, level=logging.ERROR) # Only ERROR, CRITICAL logs to this
    logger.addHandler(discord_error_handler)
else:
    logger.critical("ERROR_CHANNEL_ID not set or is 0. Critical errors will NOT be logged to a Discord channel.")

# Suppress verbose logging from discord.py and aiohttp for cleaner logs unless DEBUG_MODE is truly on
logging.getLogger('discord').setLevel(logging.INFO)
logging.getLogger('aiohttp').setLevel(logging.WARNING)


# --- Placeholders for Website Interaction ---
async def website_send_command(endpoint: str, user_id: str = None, **kwargs):
    full_url = f"{WEBSITE_API_BASE_URL}{endpoint}"
    payload = {"user_id": user_id, **kwargs}
    logger.info(f"[Website API] Sending command: {full_url} with payload: {payload}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(full_url, json=payload) as response:
                response.raise_for_status() # Raise an exception for bad status codes
                data = await response.json()
                logger.info(f"[Website API] Received response ({response.status}) from {full_url}: {data}")
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"Website API error {e.status} for {full_url}. Response: {e.message}",
                     exc_info=True,
                     extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"Failed to connect to website API at {full_url}: {e}",
                     exc_info=True,
                     extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        return {"status": "error", "message": f"Could not connect to website API. Please check server status."}
    except Exception as e:
        logger.error(f"Unexpected error interacting with website command endpoint {full_url}: {e}",
                     exc_info=True,
                     extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        return {"status": "error", "message": f"An unexpected error occurred while interacting with website."}

async def website_get_data(endpoint: str, user_id: str = None):
    query_params = f"?user_id={user_id}" if user_id else ""
    full_url = f"{WEBSITE_API_BASE_URL}{endpoint}{query_params}"
    logger.info(f"[Website API] Fetching data: {full_url}")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(full_url) as response:
                response.raise_for_status()
                data = await response.json()
                logger.info(f"[Website API] Received response ({response.status}) from {full_url}: {data}")
                return data
    except aiohttp.ClientResponseError as e:
        logger.error(f"Website API error {e.status} for {full_url}. Response: {e.message}",
                     exc_info=True,
                     extra={'endpoint': endpoint, 'status_code': e.status, 'user_id': user_id})
        return {"status": "error", "message": f"Website API error {e.status}: {e.message}"}
    except aiohttp.ClientConnectionError as e:
        logger.error(f"Failed to connect to website API at {full_url}: {e}",
                     exc_info=True,
                     extra={'endpoint': endpoint, 'error_type': 'ConnectionError', 'user_id': user_id})
        return {"status": "error", "message": f"Could not connect to website API. Please check server status."}
    except Exception as e:
        logger.error(f"Unexpected error fetching from website data endpoint {full_url}: {e}",
                     exc_info=True,
                     extra={'endpoint': endpoint, 'error_type': 'UnexpectedError', 'user_id': user_id})
        return {"status": "error", "message": f"An unexpected error occurred while fetching from website."}

# --- Website-Triggered Functions (To be called by your website's backend, e.g., via a direct API endpoint you add to the bot itself if deployed as a web service, or more simply, via Discord Webhooks for direct announcements from your website) ---

async def bot_user_connected_announcement(user_id: str, username: str = "Unknown User"):
    """
    Triggers a 'user connected' message to Discord's LOGIN_CHANNEL_ID.
    Your website's backend would call this function (e.g., if you embed a Flask/FastAPI
    in your bot or send an API call to a specific bot endpoint).
    """
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
    """
    Triggers a 'user disconnected' message to Discord's DISCONNECTED_CHANNEL_ID.
    Your website's backend would call this function.
    """
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
    logger.critical("Bot has disconnected from Discord!") # Log critical to console/file regardless

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

    # Your custom website-to-bot direct communication logic can be here, if not using webhooks.
    # Example (demonstrative, don't rely solely on message content for critical web integration)
    # This shows how a specific message could trigger bot_user_connected/disconnected_announcement
    # This is a very basic pattern. For robust systems, actual website webhooks or APIs are better.

    # Assuming these are just example 'triggers' you could have a real system call this bot.
    # For now, if a message looks like a 'connect'/'disconnect' report
    if message.channel.id == LOGGING_CHANNEL_ID: # Just as an example, monitor a specific channel
        if message.content.lower().startswith("simulate_user_connect:"):
            try:
                parts = message.content.split(":", 2) # E.g., simulate_user_connect:user123:Alice
                user_id_sim = parts[1].strip()
                username_sim = parts[2].strip() if len(parts) > 2 else "Simulated User"
                await bot_user_connected_announcement(user_id_sim, username_sim)
            except Exception as e:
                logger.error(f"Error simulating user connect: {e}", exc_info=True)
                await message.channel.send("Failed to simulate user connect. Format: `simulate_user_connect:ID:Name`")
        elif message.content.lower().startswith("simulate_user_disconnect:"):
            try:
                parts = message.content.split(":", 2) # E.g., simulate_user_disconnect:user123:Alice
                user_id_sim = parts[1].strip()
                username_sim = parts[2].strip() if len(parts) > 2 else "Simulated User"
                await bot_user_disconnected_announcement(user_id_sim, username_sim)
            except Exception as e:
                logger.error(f"Error simulating user disconnect: {e}", exc_info=True)
                await message.channel.send("Failed to simulate user disconnect. Format: `simulate_user_disconnect:ID:Name`")


    await bot.process_commands(message) # Process any defined bot commands


@bot.event
async def on_command(ctx):
    """Logs when a command is successfully invoked to both file/console and Discord logging channel."""
    # Ensure attributes are present, especially if command is from DM or test scenario
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

# --- Discord Bot Commands (All commands are the same as before, now utilizing logging infrastructure) ---
# Each command has local try-except for specific messages, and falls back to on_command_error.

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
        response_data = await website_get_data(f"/users/{user_id}/info")
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
        response_data = await website_get_data("/online_users")
        if response_data and response_data.get("status") == "success":
            users = response_data.get("data", [])
            if users:
                online_list = "\n".join([f"- `{u.get('username', 'N/A')}` (ID: `{u.get('user_id', 'N/A')}`)" for u in users])
                embed = discord.Embed(
                    title="🌐 Currently Online Users",
                    description=online_list,
                    color=0x2ecc71
                )
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
        await ctx.send("An unexpected error occurred while fetching online users. Please try again later.")

@bot.command(name='Logout')
async def logout_user(ctx, user_id: str):
    """Logs out the specified user from the site."""
    await ctx.send(f"Attempting to log out user `{user_id}`...")
    try:
        response = await website_send_command("/user/logout", user_id=user_id)
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
        response = await website_send_command("/user/panic", user_id=user_id, url=redirect_url)
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
        logger.warning(f"Invalid zoom level '{level}' for user '{user_id}' by {ctx.author}.",
                       extra={'command_name': 'ZoomControl', 'user_id': user_id, 'user_name': str(ctx.author), 'level': level})
        return
    await ctx.send(f"Setting zoom level for user `{user_id}` to `{level}%`...")
    try:
        response = await website_send_command("/user/zoom", user_id=user_id, level=level)
        await ctx.send(f"Zoom control command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in zoom_control command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ZoomControl', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting zoom for user `{user_id}`. Please try again later.")

@bot.command(name='ClearUpdates')
async def clear_updates(ctx, user_id: str):
    """Clears the user's update logs on the site."""
    await ctx.send(f"Clearing update logs for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_updates", user_id=user_id)
        await ctx.send(f"Clear updates command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_updates command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearUpdates', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing updates for user `{user_id}`. Please try again later.")

@bot.command(name='ClearNotifications')
async def clear_notifications(ctx, user_id: str):
    """Clears the user's notifications."""
    await ctx.send(f"Clearing notifications for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_notifications", user_id=user_id)
        await ctx.send(f"Clear notifications command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_notifications command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearNotifications', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing notifications for user `{user_id}`. Please try again later.")

@bot.command(name='ClearActivity')
async def clear_activity(ctx, user_id: str):
    """Clears the user's activity logs."""
    await ctx.send(f"Clearing activity logs for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_activity", user_id=user_id)
        await ctx.send(f"Clear activity command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_activity command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearActivity', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing activity logs for user `{user_id}`. Please try again later.")

@bot.command(name='ClearError')
async def clear_error(ctx, user_id: str):
    """Clears error logs for the user."""
    await ctx.send(f"Clearing error logs for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_errors", user_id=user_id)
        await ctx.send(f"Clear error command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_error command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearError', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing error logs for user `{user_id}`. Please try again later.")

@bot.command(name='ClearLoginHistory')
async def clear_login_history(ctx, user_id: str):
    """Clears the user's login logs."""
    await ctx.send(f"Clearing login history for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_login_history", user_id=user_id)
        await ctx.send(f"Clear login history command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_login_history command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearLoginHistory', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing login history for user `{user_id}`. Please try again later.")

@bot.command(name='ClearAll')
@is_admin()
async def clear_all(ctx, user_id: str):
    """Clears ALL logs/data for the specified user."""
    await ctx.send(f"**WARNING:** Executing `ClearAll` for user `{user_id}`... This is irreversible. "
                   "Confirm if you wish to proceed.")
    try:
        response = await website_send_command("/user/clear_all_data", user_id=user_id)
        await ctx.send(f"Clear All Data command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_all command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearAll', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing all data for user `{user_id}`. Please try again later.")

@bot.command(name='SetClicks')
async def set_clicks(ctx, user_id: str, count: int):
    """Sets the user's clicks count."""
    await ctx.send(f"Setting clicks for user `{user_id}` to `{count}`...")
    try:
        response = await website_send_command("/user/set_clicks", user_id=user_id, count=count)
        await ctx.send(f"Set clicks command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_clicks command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'SetClicks', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting clicks for user `{user_id}`. Please try again later.")

@bot.command(name='ClearClicks')
async def clear_clicks(ctx, user_id: str):
    """Clears all click counts for the user."""
    await ctx.send(f"Clearing clicks for user `{user_id}`...")
    try:
        response = await website_send_command("/user/clear_clicks", user_id=user_id)
        await ctx.send(f"Clear clicks command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in clear_clicks command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'ClearClicks', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while clearing clicks for user `{user_id}`. Please try again later.")

@bot.command(name='Stats')
async def get_stats(ctx, user_id: str):
    """Shows all stats for the user."""
    await ctx.send(f"Fetching stats for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/users/{user_id}/stats")
        if response_data and response_data.get("status") == "success":
            stats_data = response_data.get("data", {})
            if stats_data:
                embed = discord.Embed(
                    title=f"Statistics for {stats_data.get('username', user_id)}",
                    color=0x9b59b6
                )
                embed.add_field(name="Total Clicks", value=stats_data.get('total_clicks', 'N/A'), inline=True)
                embed.add_field(name="Session Count", value=stats_data.get('session_count', 'N/A'), inline=True)
                embed.add_field(name="Avg. Session Time", value=stats_data.get('avg_session_time', 'N/A'), inline=True)
                embed.add_field(name="Errors Logged", value=stats_data.get('error_count', 'N/A'), inline=True)
                embed.add_field(name="Last Activity", value=stats_data.get('last_activity', 'N/A'), inline=False)
                await ctx.send(embed=embed)
            else:
                await ctx.send(f"No detailed stats found for user `{user_id}`.")
        else:
            await ctx.send(f"Could not retrieve stats for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_stats command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Stats', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching user stats for `{user_id}`. Please try again later.")

@bot.command(name='SessionTime')
async def get_session_time(ctx, user_id: str):
    """Shows the current session time for the user."""
    await ctx.send(f"Fetching session time for user `{user_id}`...")
    try:
        response_data = await website_get_data(f"/users/{user_id}/session_time")
        if response_data and response_data.get("status") == "success":
            session_time = response_data.get("data", {}).get("current_session_time", "N/A")
            await ctx.send(f"Current session time for `{user_id}`: `{session_time}`.")
        else:
            await ctx.send(f"Could not retrieve session time for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_session_time command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'SessionTime', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching session time for user `{user_id}`. Please try again later.")

@bot.command(name='SetAnnouncement')
async def set_announcement(ctx, user_id: str, *, message: str):
    """Sets a custom announcement to display for the user on the site."""
    await ctx.send(f"Setting announcement for user `{user_id}`: `{message}`...")
    try:
        response = await website_send_command("/user/set_announcement", user_id=user_id, message=message)
        await ctx.send(f"Set announcement command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_announcement command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'SetAnnouncement', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting announcement for user `{user_id}`. Please try again later.")

@bot.command(name='Restart')
async def restart_user_page(ctx, user_id: str):
    """Restarts the user's page/session on the website."""
    await ctx.send(f"Restarting page for user `{user_id}`...")
    try:
        response = await website_send_command("/user/restart_page", user_id=user_id)
        await ctx.send(f"Restart page command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in restart_user_page command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Restart', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while restarting page for user `{user_id}`. Please try again later.")

@bot.command(name='Theme')
async def change_theme(ctx, user_id: str, theme_name: str):
    """Changes the user's theme (e.g., 'dark', 'light', 'custom')."""
    await ctx.send(f"Changing theme for user `{user_id}` to `{theme_name}`...")
    try:
        response = await website_send_command("/user/set_theme", user_id=user_id, theme=theme_name)
        await ctx.send(f"Change theme command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in change_theme command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Theme', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while changing theme for user `{user_id}`. Please try again later.")

@bot.command(name='Screenshot')
@is_admin()
async def screenshot_user(ctx, user_id: str):
    """Requests a screenshot of the user's screen on the website."""
    await ctx.send(f"Requesting screenshot for user `{user_id}`... This may take a moment.")
    try:
        response = await website_send_command("/user/screenshot", user_id=user_id)
        if response.get("status") == "success" and response.get("data", {}).get("image_url"):
            image_url = response["data"]["image_url"]
            await ctx.send(f"Screenshot for `{user_id}`:")
            embed = discord.Embed(title=f"Screenshot for {user_id}", color=0x3498db)
            embed.set_image(url=image_url)
            await ctx.send(embed=embed)
        else:
            await ctx.send(f"Screenshot request for `{user_id}` failed or returned no image URL. "
                           f"API Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in screenshot_user command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Screenshot', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An error occurred while requesting screenshot for user `{user_id}`. Please try again later.")

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
        logger.error(f"Error in get_user_notes command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Notes', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching user notes for `{user_id}`. Please try again later.")

@bot.command(name='SetColor')
async def set_dashboard_color(ctx, user_id: str, hex_code: str):
    """Sets the user's dashboard color (e.g., '#1abc9c')."""
    if not (hex_code.startswith('#') and len(hex_code) == 7 and all(c in '0123456789abcdefABCDEF' for c in hex_code[1:])):
        await ctx.send("Please provide a valid hex color code (e.g., `#1abc9c`).")
        logger.warning(f"Invalid hex color '{hex_code}' for user '{user_id}' by {ctx.author}.",
                       extra={'command_name': 'SetColor', 'user_id': user_id, 'user_name': str(ctx.author), 'hex_code': hex_code})
        return
    await ctx.send(f"Setting dashboard color for user `{user_id}` to `{hex_code}`...")
    try:
        response = await website_send_command("/user/set_dashboard_color", user_id=user_id, color=hex_code)
        await ctx.send(f"Set dashboard color command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_dashboard_color command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'SetColor', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting dashboard color for user `{user_id}`. Please try again later.")

@bot.command(name='Event')
async def set_custom_event(ctx, user_id: str, event_name: str, *, message: str = "N/A"):
    """Sets a custom event for the user with an optional message."""
    await ctx.send(f"Setting custom event `{event_name}` for user `{user_id}` with message: `{message}`...")
    try:
        response = await website_send_command("/user/set_event", user_id=user_id, event_name=event_name, message=message)
        await ctx.send(f"Set custom event command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in set_custom_event command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Event', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while setting custom event for user `{user_id}`. Please try again later.")

@bot.command(name='Sections')
async def control_sections(ctx, user_id: str, action: str, *, section_name: str):
    """Removes or enables specific sections on the user's website dashboard."""
    action = action.lower()
    if action not in ["remove", "enable"]:
        await ctx.send("Invalid action. Please use `remove` or `enable`.")
        logger.warning(f"Invalid section action '{action}' for user '{user_id}' by {ctx.author}.",
                       extra={'command_name': 'Sections', 'user_id': user_id, 'user_name': str(ctx.author), 'action': action, 'section': section_name})
        return
    await ctx.send(f"Attempting to `{action}` section `{section_name}` for user `{user_id}`...")
    try:
        response = await website_send_command("/user/control_section", user_id=user_id, action=action, section=section_name)
        await ctx.send(f"Section control command sent for user `{user_id}`. "
                       f"Status: {response.get('status')}, Message: {response.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in control_sections command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Sections', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while controlling section for user `{user_id}`. Please try again later.")

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
                    color=0xf1c40f
                )
                embed.add_field(name="User Agent", value=device_info.get('user_agent', 'N/A'), inline=False)
                embed.add_field(name="IP Address", value=device_info.get('ip_address', 'N/A'), inline=True)
                embed.add_field(name="Browser", value=device_info.get('browser', 'N/A'), inline=True)
                embed.add_field(name="Operating System", value=device_info.get('os', 'N/A'), inline=True)
                embed.add_field(name="Screen Resolution", value=device_info.get('screen_resolution', 'N/A'), inline=True)
                await ctx.send(embed=embed)
            else:
                await ctx.send(f"No device information found for user `{user_id}`.")
        else:
            await ctx.send(f"Could not retrieve device information for user `{user_id}`. "
                           f"API Message: {response_data.get('message', 'No message.')}")
    except Exception as e:
        logger.error(f"Error in get_device_info command for user '{user_id}' by {ctx.author}: {e}", exc_info=True,
                     extra={'command_name': 'Device', 'user_id': user_id, 'user_name': str(ctx.author)})
        await ctx.send(f"An unexpected error occurred while fetching device info for user `{user_id}`. Please try again later.")


# --- Startup and Shutdown ---
if __name__ == '__main__':
    if not DISCORD_TOKEN:
        logger.critical("DISCORD_TOKEN not found in environment variables. Bot cannot start. Exiting.")
        exit(1)

    # Helper for critical startup errors before bot.run() completes (i.e., before on_ready)
    async def send_critical_startup_error_to_discord(message: str, error_details: str):
        # This function attempts to send a message directly to Discord without waiting for bot.is_ready()
        # It's a best-effort approach for critical early errors.
        if ERROR_CHANNEL_ID != 0:
            # We must create a temporary webhook client or try directly via the bot
            # for pre-ready events. For simplicity in a single file bot,
            # this tries bot.get_channel() assuming some minimal Discord API connection.
            print(f"Attempting to send critical startup error to Discord channel {ERROR_CHANNEL_ID}.")
            error_channel = None
            if bot.is_ready(): # Check if it made it to on_ready or just past event loop setup
                error_channel = bot.get_channel(ERROR_CHANNEL_ID)

            if error_channel: # If we managed to get the channel object
                embed = discord.Embed(
                    title="🚨 CRITICAL BOT STARTUP ERROR! 🚨",
                    description=f"```fix\n{message}\n```\n**Details:** {error_details}\nBot failed to start properly. Check host logs for full traceback.",
                    color=discord.Color.dark_red(),
                    timestamp=discord.utils.utcnow()
                )
                try:
                    await error_channel.send(embed=embed)
                    print(f"Sent critical startup error to Discord channel {ERROR_CHANNEL_ID}.")
                except (discord.Forbidden, discord.HTTPException):
                    print(f"Failed to send critical startup error to Discord channel {ERROR_CHANNEL_ID} (permissions error?).")
            else:
                print(f"ERROR: Could not get Discord channel object with ID {ERROR_CHANNEL_ID} for critical startup error notification.")
        else:
            print("ERROR_CHANNEL_ID not set or is 0. Cannot send critical startup error notification to Discord.")


    try:
        logger.info("Attempting to start Discord bot...")
        bot.run(DISCORD_TOKEN)
    except discord.errors.LoginFailure as e:
        logger.critical(f"Invalid Discord Bot Token provided: {e}. Bot cannot log in. Exiting.", exc_info=True)
        # Try sending this critical error to Discord
        asyncio.run(send_critical_startup_error_to_discord("Bot Login Failed: Invalid Token", str(e)))
        exit(1)
    except Exception as e:
        # This catches any other unexpected, unhandled exceptions that prevent bot.run() from completing
        logger.critical(f"An unhandled critical error occurred before or during bot startup: {e}. Exiting.", exc_info=True)
        asyncio.run(send_critical_startup_error_to_discord("Critical Unhandled Error during Bot Startup", str(e)))
        exit(1)
