const Utils = require("../../common/utils.js");
const { REST, Routes, Events } = require("discord.js");

const logger = new Utils.Log("discordbot.event.clientready");

module.exports = {
	event: Events.ClientReady,
	/**
	 * @param {import("discord.js").Client} client
	 */
	run: async function (client) {
		logger.info("Client ready!");
		logger.info("Registering application commands...");

		logger.info("commands stored in botCommands Collection:");
		botCommands.forEach((cmd, key) => {
			logger.info(`Command Key: ${key}, Command Details: ${JSON.stringify(cmd)}`);
		});

		const commands = [];
		botCommands.forEach((cmd, key) => {
			logger.info(`Processing command: ${key}`);
			if (!cmd.data || !(cmd.data.toJSON instanceof Function)) {
				logger.info(`Error: Command "${key}" does not provide a valid 'data.toJSON()'. Skipping it.`);
				return;
			}

			try {
				const jsonData = cmd.data.toJSON();
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
			await rest.put(Routes.applicationGuildCommands(client.user.id, globalThis.config.discord.server), { body: commands });
			logger.info("commands registered to discord successfully.");
		} catch (error) {
			logger.info(`Error registering commands to discord: ${error.message}`);
		}
	},
};
