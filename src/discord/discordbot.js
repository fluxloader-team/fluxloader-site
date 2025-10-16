const { Client, Events, GatewayIntentBits, REST, Routes, Collection } = require("discord.js");
const fs = require("fs");
const Utils = require("../common/utils.js");
const path = require("path");

const logger = new Utils.Log("discordbot.main");

globalThis.botCommands = new Collection();
globalThis.botEvents = {};

// --------------------------------------------------------------------------------------

function reloadEvents() {
	// Read each file in ./discord/events and treat it as a handler for the an event
	// Use the name of the file as the event name, e.g. ready.js -> "ready" event
	logger.info("Reloading events...");

	var eventsPath = path.resolve(__dirname, "./discord/events");

	fs.readdirSync(eventsPath).forEach((file) => {
		const filePath = path.join(__dirname, "./discord/events", file);
		const eventName = file.split(".")[0];
		const eventEnum = Events[eventName];

		botEvents[eventName] = require(filePath);
		discord.client.removeAllListeners(eventEnum);
		discord.client.on(eventEnum, (event) => botEvents[eventName].run(event));

		logger.info(`Event listener registered for: ${eventName}`);
	});

	logger.info("Events registered");
}

function reloadCommands() {
	// Just load the commands into the botCommands collection
	// We later register these with the bot in the "clientready" event handler
	logger.info("Reloading commands...");

	var commandsPath = path.resolve(__dirname, "./discord/commands");

	fs.readdirSync(commandsPath).forEach((file) => {
		var filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if (command.data && command.execute) {
			botCommands.set(command.data.name, command);
			logger.info(`Command "${command.data.name}" successfully loaded.`);
		} else {
			logger.info(`Skipping file "${file}" as it's not a valid command.`);
		}
	});

	logger.info(`Available commands: ${[...botCommands.keys()].join(", ")}`);
	logger.info("commands reloaded successfully.");
}

module.exports = {
	run: function () {
		// We use the /discord/events and /discord/commands folders to load event handlers and commands
		try {
			logger.info("Starting discord bot...");

			const client = new Client({ intents: Object.values(GatewayIntentBits) });
			globalThis.discord = { client };

			reloadEvents();
			reloadCommands();

			client.login(globalThis.config.discord.token);

			logger.info("discord bot started");
		} catch (error) {
			logger.info(`Error initializing or starting discord bot: ${error.stack}`);
		}
	},
};
