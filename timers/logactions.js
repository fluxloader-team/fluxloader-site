/**
 * @file logactions.js
 * @description logs unlogged actions to the discord
 */

// Using Mongo module from db.js instead of direct MongoDB access
const Mongo = require("../shared/db");

/**
 * Namespace for Sandustry bot timer tasks.
 * @namespace logactions
 * @memberof module:timers
 */

/**
 *
 * @async
 * @function run
 * @memberof module:timers.logactions
 *
 * @returns {Promise<void>} Resolves when the timer task has completed processing.
 *
 * @throws {Error} Logs an error if any issues occur during database connection or mod validation.
 *
 */
module.exports = {
	async run() {
		var unloggedActions = await Mongo.GetAction.Get({ logged: false });
		unloggedActions = unloggedActions.splice(0, 5);
		for (var action of unloggedActions) {
			action.logged = true;
			await Mongo.GetAction.Update(action);
			await globalThis.discord.client.channels.cache.get(globalThis.config.discord.serverActionsChannel).send(`Site Action: ${action.action} by ${action.discordID}`);
		}
	},
};
