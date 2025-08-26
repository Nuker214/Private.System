// your-project-name/src/discord/commands.js
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const { logInfo, logError, logWarn, sendBotLog } = require('../utils/logging');

/**
 * Dynamically loads all command files from the 'src/discord/commands' directory
 * and its subdirectories, adding them to the client's commands collection.
 * @param {Client} client The Discord.js client instance.
 * @returns {Promise<void>}
 */
async function loadCommands(client) {
    const commandsPath = path.join(__dirname, 'commands'); // Path to the commands directory
    // Read all immediate subdirectories (e.g., 'general', 'dashboard')
    const commandFolders = fs.readdirSync(commandsPath).filter(folder => fs.statSync(path.join(commandsPath, folder)).isDirectory());

    logInfo(`Loading commands from ${commandFolders.length} categories...`);

    for (const folder of commandFolders) {
        const folderPath = path.join(commandsPath, folder);
        // Filter for JavaScript files within each command category folder
        const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(folderPath, file);
            try {
                // Dynamically import the command module
                const command = require(filePath);
                // Ensure the command module has 'data' (SlashCommandBuilder) and 'execute' properties
                if ('data' in command && 'execute' in command) {
                    client.commands.set(command.data.name, command);
                    logInfo(`Loaded command: /${command.data.name} (from ${folder}/${file})`);
                } else {
                    logWarn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                    sendBotLog('ERROR_LOGGING_INFORMATION', `⚠️ Command file \`${file}\` is malformed (missing data/execute).`);
                }
            } catch (error) {
                logError(`[ERROR] Failed to load command from ${filePath}:`, error);
                sendBotLog('ERROR_LOGGING_INFORMATION', `❌ Failed to load command \`${file}\`: \`${error.message}\``);
            }
        }
    }
    logInfo(`Finished loading commands. Total ${client.commands.size} commands loaded.`);
}

/**
 * Registers the loaded commands with the Discord API.
 * This makes the slash commands available to users in Discord.
 * @param {Client} client The Discord.js client instance.
 * @returns {Promise<void>}
 */
async function registerCommands(client) {
    const commandsToRegister = [];
    // Extract the JSON data for each command from the client's commands collection
    for (const command of client.commands.values()) {
        commandsToRegister.push(command.data.toJSON());
    }

    // Initialize Discord's REST API client with the bot token
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    try {
        logInfo(`Started refreshing ${commandsToRegister.length} application (/) commands.`);

        // The `put` method is used to fully refresh all commands.
        // `Routes.applicationCommands(client.user.id)` registers commands globally.
        // This can take up to an hour for Discord to propagate, but is suitable for production.
        // For development, `Routes.applicationGuildCommands(clientId, guildId)` is faster for testing.
        const data = await rest.put(
            Routes.applicationCommands(client.user.id), // Global commands for your bot
            { body: commandsToRegister },
        );

        logInfo(`Successfully reloaded ${data.length} application (/) commands.`);
        sendBotLog('BOT_LOGGING_INFORMATION', `✨ Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        logError('❌ Failed to register Discord commands with the API:', error);
        sendBotLog('ERROR_LOGGING_INFORMATION', `🚨 **Failed to Register Discord Commands!**\n\`\`\`${error.message}\n${error.stack ? error.stack.substring(0, 1000) : 'No stack trace'}\`\`\``);
    }
}

module.exports = {
    loadCommands,
    registerCommands
};
