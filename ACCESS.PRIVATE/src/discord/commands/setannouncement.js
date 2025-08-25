const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setannouncement')
        .setDescription('Sets a custom announcement for a specific user on the website.')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The announcement message.')
                .setRequired(true)),
    async execute(interaction, backendUrl) {
        const targetUserId = interaction.options.getString('userid');
        const message = interaction.options.getString('message');

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/announcement/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, message }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
            } else {
                await interaction.editReply(`Failed to set announcement: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/announcement/set:', error);
            await interaction.editReply('There was an error communicating with the backend to set announcement.');
        }
    },
};
