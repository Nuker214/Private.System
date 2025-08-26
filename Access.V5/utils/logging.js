// your-project-name/src/utils/logging.js
// We require the entire module so we can call discordClient.getDiscordClient() later.
// This prevents circular dependency issues during module loading.
const discordClientModule = require('../discord/discord_client');
const discordChannels = require('../config/discord_channels.json'); // Contains mappings for channel keys to Discord Channel IDs

/**
 * Logs an informational message to the console.
 * @param {string} message The main message to log.
 * @param {...any} args Additional arguments to log (e.g., objects, variables).
 */
function logInfo(message, ...args) {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`, ...args);
}

/**
 * Logs an error message to the console.
 * @param {string} message The main error message to log.
 * @param {...any} args Additional arguments to log (e.g., error objects, stack traces).
 */
function logError(message, ...args) {
    console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, ...args);
}

/**
 * Logs a warning message to the console.
 * @param {string} message The main warning message to log.
 * @param {...any} args Additional arguments to log.
 */
function logWarn(message, ...args) {
    console.warn(`[WARN] ${new Date().toISOString()}: ${message}`, ...args);
}

/**
 * Sends a message to a specific Discord channel via the initialized bot.
 * This function uses a 'channelKey' from `discord_channels.json` to find the target channel ID.
 * It's designed to be asynchronous as Discord API calls are network operations.
 *
 * @param {string} channelKey The key from `src/config/discord_channels.json` (e.g., 'BOT_ONLINE_STATUS', 'ERROR_LOGGING_INFORMATION').
 * @param {string} message The text content of the message to send.
 * @param {object} [embed=null] An optional Discord embed object to include with the message.
 * @returns {Promise<boolean>} True if the message was sent successfully, false otherwise.
 */
async function sendBotLog(channelKey, message, embed = null) {
    const channelId = discordChannels[channelKey];
    if (!channelId) {
        logWarn(`Attempted to send bot log to unknown channel key: '${channelKey}'. Message: '${message.substring(0, 50)}...'`);
        return false;
    }

    // Safely get the Discord client instance.
    // The client might not be fully initialized or connected yet during early application startup.
    const client = discordClientModule.getDiscordClient ? discordClientModule.getDiscordClient() : null;

    // Check if the client exists and is in a ready state (0 = ready/connected)
    if (!client || client.ws.status !== 0) {
        logWarn(`Discord client not ready to send log to '${channelKey}' (status: ${client ? client.ws.status : 'N/A'}). Message: '${message.substring(0, 50)}...'`);
        return false;
    }

    try {
        // Fetch the channel object from Discord
        const channel = await client.channels.fetch(channelId);

        // Ensure the channel exists and is a text-based channel where messages can be sent
        if (channel && channel.isTextBased()) {
            const options = { content: message };
            if (embed) {
                options.embeds = [embed]; // Discord.js expects an array of embeds
            }
            await channel.send(options);
            return true;
        } else {
            logWarn(`Target Discord channel with ID '${channelId}' (key: '${channelKey}') not found or is not a text channel.`);
            return false;
        }
    } catch (error) {
        logError(`❌ Failed to send bot log to channel '${channelKey}' (ID: ${channelId}):`, error.message, error.stack);
        return false;
    }
}

module.exports = {
    logInfo,
    logError,
    logWarn,
    sendBotLog
};
