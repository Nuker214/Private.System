const { SlashCommandBuilder } = require('discord.js');
const fetch = require('node-fetch');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getlogs')
        .setDescription('Retrieves specific logs for a user from the website.')
        .addStringOption(option =>
            option.setName('userid')
                .setDescription('The User ID of the target website user.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('log_type')
                .setDescription('The type of logs to retrieve (activity, error, login).')
                .setRequired(true)
                .addChoices(
                    { name: 'Activity Logs', value: 'activity' },
                    { name: 'Error Logs', value: 'error' },
                    { name: 'Login History', value: 'login' },
                )),
    async execute(interaction, backendUrl) {
        const targetUserId = interaction.options.getString('userid');
        const logType = interaction.options.getString('log_type');

        try {
            await interaction.deferReply({ ephemeral: true });

            const response = await fetch(`${backendUrl}/user/logs/get`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId, log_type: logType }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await interaction.editReply(`Command sent to backend: ${data.message}`);
                // Note: The frontend will collect and send these logs back to the backend
                // You would need another backend endpoint to receive these logs and then
                // potentially send them to Discord.
            } else {
                await interaction.editReply(`Failed to request logs: ${data.message || 'Unknown error.'}`);
            }
        } catch (error) {
            console.error('Error calling backend /user/logs/get:', error);
            await interaction.editReply('There was an error communicating with the backend to get logs.');
        }
    },
};
