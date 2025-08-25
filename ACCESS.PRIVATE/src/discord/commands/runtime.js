const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('runtime')
        .setDescription('Shows how long the backend server has been running.'),
    async execute(interaction, backendUrl) {
        try {
            await interaction.deferReply(); // Not ephemeral

            const response = await fetch(`${backendUrl}/runtime`);
            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`**Server Runtime:** ${data.message}\nServer Start Time: ${new Date(data.serverStartTime).toLocaleString()}`);
            } else {
                await interaction.editReply(`Failed to get server runtime: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /runtime:', error);
            await interaction.editReply('There was an error communicating with the backend to get runtime.');
        }
    },
};
