/**
 * @file interactioncreate.js
 * @description Handles the "interactioncreate" event in a discord bot. This event is fired whenever a user interacts with the bot through a registered slash command or other interactions.
 * Validates and executes the appropriate command from the global command collection.
 */

var Utils = require("../../common/utils.js");

var log = new Utils.Log("sandustry.bot.event.interactioncreate", "./sandustry.bot.main.txt", true);
process.on("uncaughtException", function (err) {
	log.info(`Caught exception: ${err.stack}`);
});
/**
 * Namespace for discord bot interaction handling.
 * @namespace interactioncreate
 * @memberof module:discord.Events
 */

/**
 * Handles the discord client's `interactioncreate` event, triggered whenever a user interacts with the bot through a command or other interaction.
 *
 * @async
 * @function run
 * @memberof module:discord.Events.interactioncreate
 * @param interaction - The interaction object representing the user's interaction with the bot.
 *
 * @returns {Promise<void>} Resolves when the interaction has been processed and the appropriate command executed, if applicable.
 *
 * @throws {Error} Logs and replies to the user if an error occurs while executing the command.
 *
 */
module.exports = {
	run: async (interaction) => {
		log.info(`Interaction: ${interaction.commandName}`);
		if (!interaction.isCommand()) return;

		var command = globalThis.Botcommands.get(interaction.commandName);
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
