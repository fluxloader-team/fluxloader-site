const Mongo = require("../common/db");

module.exports = {
	async run() {
		var unloggedActions = await Mongo.GetAction.Get({ logged: false });
		if (!unloggedActions) return;
		unloggedActions = unloggedActions.splice(0, 5);
		for (var action of unloggedActions) {
			action.logged = true;
			await Mongo.GetAction.Update(action);
			if (globalThis.discord) {
				await globalThis.discord.client.channels.cache.get(globalThis.config.discord.serverActionsChannel).send(`Site Action: ${action.action} by ${action.discordID}`);
			}
		}
	},
};
