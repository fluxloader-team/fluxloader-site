const DB = require("../common/db");

module.exports = {
	async run() {
		var unloggedActions = await DB.actions.get({ logged: false });
		if (!unloggedActions) return;

		// Log the first 5 unlogged actions
		const toLog = unloggedActions.splice(0, 5);
		for (var action of toLog) {
			action.logged = true;
			await DB.actions.update(action);

			// For now we are just posting these to the discord server actions channel
			if (globalThis.discord) {
				await globalThis.discord.client.channels.cache.get(globalThis.config.discord.serverActionsChannel).send(`Site Action: ${action.action} by ${action.discordID}`);
			}
		}
	},
};
