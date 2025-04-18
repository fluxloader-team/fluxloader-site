/**
 * @file InteractionCreate.js
 * @description Handles the "interactionCreate" event in a Discord bot. This event is fired whenever a user interacts with the bot through a registered slash command or other interactions.
 * Validates and executes the appropriate command from the global command collection.
 */

var colors = require('colors');
var Utils = require('./../../utils')

var log = new Utils.log.log(colors.green("Sandustry.bot.event.interactionCreate"), "./sandustry.bot.main.txt", true);
process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});
/**
 * Namespace for Discord bot interaction handling.
 * @namespace interactionCreate
 * @memberof module:discord.Events
 */

/**
 * Handles the Discord client's `interactionCreate` event, triggered whenever a user interacts with the bot through a command or other interaction.
 *
 * @async
 * @function run
 * @memberof module:discord.Events.interactionCreate
 * @param interaction - The interaction object representing the user's interaction with the bot.
 *
 * @returns {Promise<void>} Resolves when the interaction has been processed and the appropriate command executed, if applicable.
 *
 * @throws {Error} Logs and replies to the user if an error occurs while executing the command.
 *
 */
module.exports = {
    run: async (interaction) => {
        log.log(`Interaction: ${interaction.commandName}`)
        if (!interaction.isCommand()) return;

        var command = globalThis.BotCommands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({ content: `Command \`${interaction.commandName}\` not found.`, ephemeral: true });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);

            await interaction.reply({ 
                content: 'There was an error while executing this command. Please try again later.', 
                ephemeral: true 
            });
        }
    },
};