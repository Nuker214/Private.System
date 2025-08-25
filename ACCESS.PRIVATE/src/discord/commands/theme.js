const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('theme')
        .setDescription('Changes the theme for a specific user on the website.')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('theme_name')
                .setDescription('The theme name (e.g., dark, light).')
                .setRequired(true)
                .addChoices(
                    { name: 'Dark', value: 'dark' },
                    { name: 'Light', value: 'light' },
                )),
    async execute(interaction, backendUrl) {
        const targetUserId = interaction.options.getString('userid');
        const themeName = interaction.options.getString('theme_name');

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/theme/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, theme_name: themeName }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
            } else {
                await interaction.editReply(`Failed to set theme: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/theme/set:', error);
            await interaction.editReply('There was an error communicating with the backend to set theme.');
        }
    },
};
