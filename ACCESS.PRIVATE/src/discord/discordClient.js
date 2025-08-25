const { Client, GatewayIntentBits, Collection, REST, Routes } = require('discord.js');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logging'); // Your centralized logging utility
const fetch = require('node-fetch'); // For making HTTP requests to your backend

// Load environment variables
require('dotenv').config();
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID; // Your bot's application ID
const GUILD_ID = process.env.DISCORD_GUILD_ID;   // Optional: For testing guild-specific commands
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000/api'; // Your backend API base URL
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // Admin key for privileged commands

// Create a new Discord client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,          // Required for guild-related events
        GatewayIntentBits.GuildMessages,   // Required for message-related events
        GatewayIntentBits.MessageContent,  // Required to read message content (for prefix commands, if any)
        GatewayIntentBits.DirectMessages   // For DM interactions
    ],
});

// Store commands in a Collection
client.commands = new Collection();
const commands = []; // Array to hold command data for Discord API registration

// Path to the commands directory
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load command files
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Set a new item in the Collection with the key as the command name and the value as the exported module
    if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON()); // Add command data for registration
        logger.info(`Loaded Discord command: ${command.data.name}`);
    } else {
        logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
    }
}

// --- Discord Events ---

// When the client is ready, run this once
client.once('ready', async () => {
    logger.info(`Discord bot logged in as ${client.user.tag}!`);

    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(DISCORD_BOT_TOKEN);

    try {
        logger.info(`Started refreshing ${commands.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
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
        // Pass the backend URL and admin key to the command's execute function
        await command.execute(interaction, BACKEND_URL, ADMIN_API_KEY);
    } catch (error) {
        logger.error(`Error executing Discord command ${interaction.commandName}: ${error.message}`, { stack: error.stack });
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

// Handle Discord API errors
client.on('error', error => {
    logger.error(`Discord client error: ${error.message}`, { stack: error.stack });
});

// Handle warnings
client.on('warn', info => {
    logger.warn(`Discord client warning: ${info}`);
});

// Export the client instance
module.exports = { client };
