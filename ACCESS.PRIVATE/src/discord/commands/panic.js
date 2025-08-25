const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panic')
        .setDescription('Panics a user to a specified URL or about:blank.')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('redirect_url')
                .setDescription('The URL to redirect the user to (default: about:blank).')
                .setRequired(false)),
    async execute(interaction, backendUrl) {
        const targetUserId = interaction.options.getString('userid');
        const redirectUrl = interaction.options.getString('redirect_url') || 'about:blank';

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/panic`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, redirect_url: redirectUrl }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
            } else {
                await interaction.editReply(`Failed to panic user: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/panic:', error);
            await interaction.editReply('There was an error communicating with the backend for user panic.');
        }
    },
};
