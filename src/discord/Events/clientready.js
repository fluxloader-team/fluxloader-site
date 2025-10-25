const Utils = require("../../common/utils.js");
const { REST, Routes } = require("discord.js");

const logger = new Utils.Log("discordbot.event.clientready");

async function registerCommands() {
	logger.info("Registering application commands...");

	logger.info("commands stored in botCommands Collection:");
	botCommands.forEach((cmd, key) => {
		logger.info(`Command Key: ${key}, Command Details: ${JSON.stringify(cmd)}`);
	});

	var commands = [];
	botCommands.forEach((cmd, key) => {
		logger.info(`Processing command: ${key}`);
		if (!cmd.data || !(cmd.data.toJSON instanceof Function)) {
			logger.info(`Error: Command "${key}" does not provide a valid 'data.toJSON()'. Skipping it.`);
			return;
		}

		try {
			var jsonData = cmd.data.toJSON();
			logger.info(`Generated JSON for command "${key}": ${JSON.stringify(jsonData)}`);
			commands.push(jsonData);
			logger.info(`Command "${key}" added to commands array.`);
		} catch (err) {
			logger.info(`Error while generating JSON for command "${key}": ${err.message}`);
		}
	});

	logger.info(`Final commands to be registered: ${JSON.stringify(commands)}`);

	var rest = new REST({ version: "10" }).setToken(globalThis.config.discord.token);
	try {
		await rest.put(Routes.applicationGuildCommands(globalThis.discord.client.user.id, "1359169971611111736"), { body: commands });
		logger.info("commands registered to discord successfully.");
	} catch (error) {
		logger.info(`Error registering commands to discord: ${error.message}`);
	}
}

module.exports = {
	run: async function () {
		logger.info("Client ready!");
		await registerCommands();
	},
};
