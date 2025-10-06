/**
 * @file clientready.js
 * @description Handles the "ready" event for a discord bot client. This event is triggered when the bot successfully connects and becomes ready to interact with the discord API.
 * It performs necessary setup tasks, such as command registration, and logs the status for monitoring purposes.
 */

var Utils = require("../../common/utils.js");

const log = new Utils.Log("sandustry.bot.event.clientready", "./sandustry.bot.main.txt", true);
process.on("uncaughtException", function (err) {
	log.info(`Caught exception: ${err.stack}`);
});
/**
 * Namespace for discord bot events handling.
 * @namespace clientready
 * @memberof module:discord.Events
 */
/**
 * Handles the discord client's `ready` event.
 *
 * @async
 * @function run
 * @memberof module:discord.Events.clientready
 * @param readyClient - The discord client instance that emitted the `ready` event.
 *
 * @returns {Promise<void>} Resolves once all setup tasks (e.g., command registration) are complete.
 *
 * @throws {Error} Logs any runtime issues or uncaught exceptions during initialization.
 *
 */
module.exports = {
	run: async function (readyClient) {
		await registercommands();
		log.info("Client ready!");
	},
};
