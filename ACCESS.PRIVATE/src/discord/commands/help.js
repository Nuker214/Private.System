const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Lists all available commands.'),
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Acknowledge the command, only visible to the user who ran it

        const commands = interaction.client.commands; // Access the bot's command collection

        if (!commands || commands.size === 0) {
            return interaction.editReply('No commands found!');
        }

        // Filter out commands that might be considered "admin-only" or sensitive if you wish
        // For now, we'll list all commands.
        const commandList = commands
            .map(cmd => `\`/${cmd.data.name}\`: ${cmd.data.description}`)
            .sort() // Sort alphabetically for better readability
            .join('\n');

        const helpEmbed = new EmbedBuilder()
            .setColor(0x0099FF) // A nice blue color
            .setTitle('Available Commands')
            .setDescription(commandList)
            .setTimestamp()
            .setFooter({ text: 'Enhanced Private System Bot' });

        await interaction.editReply({ embeds: [helpEmbed] });
    },
};
