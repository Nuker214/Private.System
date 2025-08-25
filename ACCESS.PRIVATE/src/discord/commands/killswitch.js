const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('killswitch')
        .setDescription('!!! ADMIN ONLY !!! Shuts down the entire backend server.')
        .addStringOption(option =>
            option.setName('confirm_key')
                .setDescription('Enter the Admin API Key to confirm server shutdown.')
                .setRequired(true)),
    async execute(interaction, backendUrl, adminApiKey) { // adminApiKey is passed here
        const confirmKey = interaction.options.getString('confirm_key');

        if (confirmKey !== adminApiKey) {
            return interaction.reply({ content: 'Incorrect Admin API Key. Server shutdown aborted.', ephemeral: true });
        }

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/admin/kill`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include the admin key for authentication
                    'X-Admin-Key': adminApiKey
                },
                body: JSON.stringify({ adminKey: adminApiKey }), // Also send in body for backend middleware
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}\n**The server will now shut down.**`);
            } else {
                await interaction.editReply(`Failed to initiate server shutdown: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /admin/kill:', error);
            await interaction.editReply('There was an error communicating with the backend for kill switch. Check server logs.');
        }
    },
};
