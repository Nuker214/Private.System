const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('information')
        .setDescription('Shows detailed information about a user on the website.')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true)),
    async execute(interaction, backendUrl) {
        const targetUserId = interaction.options.getString('userid');

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
            } else {
                await interaction.editReply(`Failed to request user info: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/info:', error);
            await interaction.editReply('There was an error communicating with the backend for user info.');
        }
    },
};
