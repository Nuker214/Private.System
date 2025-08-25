const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('websitestatus')
        .setDescription('Checks the operational status of the backend server.'),
    async execute(interaction, backendUrl) {
        try {
            await interaction.deferReply(); // Not ephemeral, as this is general status

            const response = await fetch(`${backendUrl}/status`);
            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`**Website Status:** ${data.status.toUpperCase()}\nMessage: ${data.message}\nTimestamp: ${new Date(data.timestamp).toLocaleString()}`);
            } else {
                await interaction.editReply(`Failed to get website status: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /status:', error);
            await interaction.editReply('There was an error communicating with the backend to get status.');
        }
    },
};
