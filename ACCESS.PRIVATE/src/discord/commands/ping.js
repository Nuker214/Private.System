const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Checks if the backend server is alive and responsive.'),
    async execute(interaction, backendUrl) {
        try {
            await interaction.deferReply(); // Not ephemeral

            const startTime = Date.now();
            const response = await fetch(`${backendUrl}/ping`);
            const endTime = Date.now();
            const apiLatency = endTime - startTime;

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`**Pong!**\nBackend Message: ${data.message}\nAPI Latency: ${apiLatency}ms\nTimestamp: ${new Date(data.timestamp).toLocaleString()}`);
            } else {
                await interaction.editReply(`Failed to ping backend: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /ping:', error);
            await interaction.editReply('There was an error communicating with the backend to ping.');
        }
    },
};
