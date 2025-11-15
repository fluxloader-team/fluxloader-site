const Utils = require("../../../common/utils.js");
const { Events } = require("discord.js");

const logger = new Utils.Log("discordbot.event.interactioncreate");

module.exports = {
	event: Events.InteractionCreate,
	/**
	 * @param {import("discord.js").Interaction} interaction
	 */
	run: async (interaction) => {
		logger.info(`Interaction: ${interaction.commandName}`);
		if (!interaction.isCommand()) return;

		var command = globalThis.discord.client.commands.get(interaction.commandName);
		if (!command) {
			await interaction.reply({ content: `Command \`${interaction.commandName}\` not found.`, ephemeral: true });
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(`Error executing command ${interaction.commandName}:`, error);

			await interaction.reply({
				content: "There was an error while executing this command. Please try again later.",
				ephemeral: true,
			});
		}
	},
};
