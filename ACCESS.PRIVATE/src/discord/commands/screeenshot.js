const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('screenshot')
        .setDescription('Requests a screenshot from a specific user\'s website (Admin Only).')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true)),
    async execute(interaction, backendUrl, adminApiKey) { // adminApiKey is passed here
        const targetUserId = interaction.options.getString('userid');

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/screenshot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include the admin key for authentication
                    'X-Admin-Key': adminApiKey // Custom header for admin key
                },
                body: JSON.stringify({ targetUserId, adminKey: adminApiKey }), // Also send in body for backend middleware
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
            } else {
                await interaction.editReply(`Failed to request screenshot: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/screenshot:', error);
            await interaction.editReply('There was an error communicating with the backend for screenshot request.');
        }
    },
};
