const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js'); // Ensure EmbedBuilder is imported
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logging');
const fetch = require('node-fetch'); // Still needed for commands that interact with backend API
const { sendWebhook, createEmbedsFromFields } = require('../../utils/discordWebhookSender'); // Still needed for backend-initiated webhooks if any

// Load environment variables
require('dotenv').config();
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api';
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

// --- Discord Channel IDs (for direct bot messages) ---
// These are used by the bot to send messages directly to specific channels.
const channelIds = {
    botOnlineStatus: process.env.DISCORD_BOT_ONLINE_STATUS_CHANNEL_ID,
    botDisconnectedStatus: process.env.DISCORD_BOT_DISCONNECTED_STATUS_CHANNEL_ID,
    botLoggingInformation: process.env.DISCORD_BOT_LOGGING_INFORMATION_CHANNEL_ID,
    errorLoggingInformation: process.env.DISCORD_ERROR_LOGGING_INFORMATION_CHANNEL_ID,
    holdingArea: process.env.DISCORD_HOLDING_AREA_CHANNEL_ID // For general bot testing/backend server status
};

// --- Discord Webhook URLs (for backend-initiated webhooks, if any) ---
// This object is now empty or contains only webhooks that are NOT related to login/user info.
// If backend.js needs to send any webhooks (e.g., GitHub events), they would be defined here.
// For now, based on your request to remove "information webhooks", this object is empty.
const webhooks = {}; // No specific webhooks defined here for now, as per your request.


// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
});

// Store commands in a Collection
client.commands = new Collection();
const commands = [];

// Path to the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.info(`Loaded Discord command: ${command.data.name}`);
    } else {
        logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

/**
 * Sends a message directly to a Discord channel using the bot client.
 * @param {string} channelId The ID of the target Discord channel.
 * @param {EmbedBuilder} embed The Discord Embed to send.
 * @param {string} logMessage A message to log locally.
 */
async function sendBotMessageToChannel(channelId, embed, logMessage) {
    if (!channelId) {
        logger.error(`Attempted to send bot message with undefined channel ID for embed: ${embed.data.title}`);
        return;
    }
    try {
        const channel = await client.channels.fetch(channelId);
        if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
            logger.info(logMessage);
        } else {
            logger.error(`Could not find text channel with ID ${channelId} or it's not a text channel.`);
        }
    } catch (error) {
        logger.error(`Failed to send bot message to channel ${channelId}: ${error.message}`, { stack: error.stack });
    }
}

// --- Discord Events ---

// When the client is ready, run this once
client.once('ready', async () => {
    logger.info(`Discord bot logged in as ${client.user.tag}!`);

    // Send BOT_ONLINE_STATUS direct bot message
    const embed = new EmbedBuilder()
        .setTitle("🟢 Discord Bot Online")
        .setDescription(`Bot **${client.user.tag}** is now online and operational.`)
        .setColor(0x00FF00) // Green
        .addFields(
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false },
            { name: "Bot Tag", value: client.user.tag, inline: true },
            { name: "Client ID", value: client.user.id, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: "Bot Status Reporter" });

    await sendBotMessageToChannel(channelIds.botOnlineStatus, embed, "Bot online status message sent.");

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);
        const data = await rest.put(
            GUILD_ID ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID) : Routes.applicationCommands(CLIENT_ID),
            { body: commands },
        );
        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logger.error(`Failed to register slash commands: ${error.message}`, { stack: error.stack });
    }
});

// Listen for interactions (e.g., slash commands)
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        logger.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction, BACKEND_URL, ADMIN_API_KEY);
    } catch (error) {
        logger.error(`Error executing Discord command ${interaction.commandName}: ${error.message}`, { stack: error.stack });
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
        // Send error to ERROR_LOGGING_INFORMATION channel via bot message
        const errorEmbed = new EmbedBuilder()
            .setTitle("🚨 Discord Bot Command Error")
            .setDescription(`An error occurred while executing command \`/${interaction.commandName}\`.`)
            .setColor(0xFF0000) // Red
            .addFields(
                { name: "Command", value: interaction.commandName, inline: true },
                { name: "User", value: interaction.user.tag, inline: true },
                { name: "Error", value: error.message.substring(0, Math.min(1024, error.message.length)), inline: false },
                { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
            )
            .setTimestamp()
            .setFooter({ text: "Bot Error Reporter" });

        await sendBotMessageToChannel(channelIds.errorLoggingInformation, errorEmbed, "Bot command error message sent.");
    }
});

// Handle Discord API errors (e.g., connection issues)
client.on('error', async error => {
    logger.error(`Discord client error: ${error.message}`, { stack: error.stack });
    const embed = new EmbedBuilder()
        .setTitle("🔴 Discord Bot Critical Error")
        .setDescription(`Bot encountered a critical error and may be disconnected.`)
        .setColor(0xFF0000) // Red
        .addFields(
            { name: "Error", value: error.message.substring(0, Math.min(1024, error.message.length)), inline: false },
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
        )
        .setTimestamp()
        .setFooter({ text: "Bot Status Reporter" });

    await sendBotMessageToChannel(channelIds.botDisconnectedStatus, embed, "Bot critical error message sent.");
});

// Handle warnings
client.on('warn', async info => { // Make this async
    logger.warn(`Discord client warning: ${info}`);
    const embed = new EmbedBuilder()
        .setTitle("🟡 Discord Bot Warning")
        .setDescription(`Bot received a warning.`)
        .setColor(0xFFA500) // Orange
        .addFields(
            { name: "Warning Info", value: info.substring(0, Math.min(1024, info.length)), inline: false },
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
        )
        .setTimestamp()
        .setFooter({ text: "Bot Logger" });

    await sendBotMessageToChannel(channelIds.botLoggingInformation, embed, "Bot warning message sent.");
});

// Listen for actual disconnect events (e.g., if using sharding or unexpected disconnect)
client.on('shardDisconnect', async (event, id) => {
    logger.warn(`Discord bot shard ${id} disconnected: ${event.reason}`);
    const embed = new EmbedBuilder()
        .setTitle("🟠 Discord Bot Disconnected")
        .setDescription(`Bot shard **${id}** disconnected.`)
        .setColor(0xFFA500) // Orange
        .addFields(
            { name: "Shard ID", value: id.toString(), inline: true },
            { name: "Reason", value: event.reason || 'Unknown', inline: false },
            { name: "Timestamp", value: new Date().toLocaleString(), inline: false }
        )
        .setTimestamp()
        .setFooter({ text: "Bot Status Reporter" });

    await sendBotMessageToChannel(channelIds.botDisconnectedStatus, embed, "Bot shard disconnected message sent.");
});

// Export the client instance
module.exports = { client };
