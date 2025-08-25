const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('event')
        .setDescription('Sets a custom event for a specific user on the website.')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('event_name')
                .setDescription('The name of the event.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('A descriptive message for the event.')
                .setRequired(true)),
    async execute(interaction, backendUrl) {
        const targetUserId = interaction.options.getString('userid');
        const eventName = interaction.options.getString('event_name');
        const message = interaction.options.getString('message');

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/event/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, event_name: eventName, message }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
            } else {
                await interaction.editReply(`Failed to add event: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/event/add:', error);
            await interaction.editReply('There was an error communicating with the backend to add event.');
        }
    },
};
