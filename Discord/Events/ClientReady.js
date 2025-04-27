/**
 * @file ClientReady.js
 * @description Handles the "ready" event for a Discord bot client. This event is triggered when the bot successfully connects and becomes ready to interact with the Discord API.
 * It performs necessary setup tasks, such as command registration, and logs the status for monitoring purposes.
 */

var colors = require('colors');
var Utils = require('./../../utils')

const log = new Utils.log.log("Sandustry.bot.event.ClientReady", "./sandustry.bot.main.txt", true);
process.on('uncaughtException', function (err) {
    log.info(`Caught exception: ${err.stack}`);
});
/**
 * Namespace for Discord bot events handling.
 * @namespace clientReady
 * @memberof module:discord.Events
 */
/**
 * Handles the Discord client's `ready` event.
 *
 * @async
 * @function run
 * @memberof module:discord.Events.clientReady
 * @param readyClient - The Discord client instance that emitted the `ready` event.
 *
 * @returns {Promise<void>} Resolves once all setup tasks (e.g., command registration) are complete.
 *
 * @throws {Error} Logs any runtime issues or uncaught exceptions during initialization.
 *
 */
module.exports = {
    run: async function (readyClient) {
        await registerCommands();
        log.info("Client ready!");
    }
}