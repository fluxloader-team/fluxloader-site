const { Client, Collection } = require("discord.js");
const fs = require("fs");
const Utils = require("../common/utils.js");
const path = require("path");

const logger = new Utils.Log("discordbot.main");

globalThis.botEvents = {};

// --------------------------------------------------------------------------------------

function reloadEvents() {
	// Read each file in ./discord/events and treat it as a handler for the an event
	// Use the name of the file as the event name, e.g. ready.js -> "ready" event
	logger.info("Reloading events...");

	var eventsPath = path.resolve(__dirname, "./events");

	fs.readdirSync(eventsPath).forEach((file) => {
		const filePath = path.join(__dirname, "./events", file);
		const eventFile = require(filePath);

		botEvents[eventFile.event] = require(filePath);
		discord.client.removeAllListeners(eventFile.event);
		discord.client.on(eventFile.event, (...args) => botEvents[eventFile.event].run(...args));

		logger.info(`Event listener registered for: ${eventFile.event}`);
	});

	logger.info("Events registered");
}

/**
 * @param {import("discord.js").Client} client
 */
function reloadCommands(client) {
	// Just load the commands into the botCommands collection
	// We later register these with the bot in the "clientready" event handler
	logger.info("Reloading commands...");

	var commandsPath = path.resolve(__dirname, "./commands");

	fs.readdirSync(commandsPath).forEach((file) => {
		var filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if (command.data && command.execute) {
			client.commands.set(command.data.name, command);
			logger.info(`Command "${command.data.name}" successfully loaded.`);
		} else {
			logger.info(`Skipping file "${file}" as it's not a valid command.`);
		}
	});

	logger.info(`Available commands: ${[...client.commands.keys()].join(", ")}`);
	logger.info("commands reloaded successfully.");
}

module.exports = {
	run: function () {
		// We use the /discord/events and /discord/commands folders to load event handlers and commands
		try {
			logger.info("Starting discord bot...");

			// We don't need intents because the interaction event is sent no matter what
			const client = new Client({ intents: [] });

			/** @type {import("discord.js").Collection<String,null>} */
			client.commands = new Collection();

			globalThis.discord = { client };

			reloadEvents();
			reloadCommands(client);

			client.login(globalThis.config.discord.token);

			logger.info("discord bot started");
		} catch (error) {
			logger.info(`Error initializing or starting discord bot: ${error.stack}`);
		}
	},
};
