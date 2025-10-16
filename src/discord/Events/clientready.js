const Utils = require("../../common/utils.js");

const logger = new Utils.Log("sandustry.bot.event.clientready", "./sandustry.bot.main.txt", true);

process.on("uncaughtException", function (err) {
	logger.info(`Caught exception: ${err.stack}`);
});

module.exports = {
	run: async function (readyClient) {
		await registercommands();
		logger.info("Client ready!");
	},
};
