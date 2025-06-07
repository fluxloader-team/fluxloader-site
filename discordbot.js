/**
 * @file discordbot.js
 * @description The main module for handling discord bot functionality, including commands, events, and integration with the discord API.
 * This is the central module for all discord-related namespaces in the application.
 */

/**
 * discord bot stuff
 * @module discord
 */

/**
 * Namespace for discord bot events handling.
 * @namespace Events
 * @memberof module:discord
 */

/**
 * Namespace for discord bot command handling.
 * @namespace commands
 * @memberof module:discord
 */

var { Client, Events, GatewayIntentBits, REST, Routes, Collection } = require("discord.js");
var crypto = require("crypto");
var fs = require("fs");
var Utils = require("./utils");
var path = require("path");

var log = new Utils.Log("sandustry.bot.main", "./sandustry.bot.main.txt", true);

process.on("uncaughtException", function (err) {
	log.info(`Caught exception: ${err.stack}`);
});

/**
 * Default structure for bot events.
 * @namespace BotEvents
 * @memberof module:discord
 * @property {Object} eventName - Placeholder for an event.
 * @property {Function} eventName.run - The function to execute for the event.
 */
globalThis.botEvents = {
	eventName: {
		run: function (event) {},
	},
};

/**
 * Computes a hash of the repository directory.
 * This provides a unique checksum for versioning or verifying the state of a directory.
 *
 * @function computeRepoHash
 * @memberof module:discord
 * @param {string} [directory='./'] - The directory to hash.
 * @returns {string} The SHA-256 hash of the given directory.
 */
function computeRepoHash(directory = "./") {
	var folderHash = crypto.createHash("sha256");

	function hashDirectory(dir) {
		var files = fs.readdirSync(dir);
		files.forEach((file) => {
			var fullPath = path.join(dir, file);
			var fileStat = fs.statSync(fullPath);

			if (fileStat.isDirectory()) {
				hashDirectory(fullPath);
			} else if (fileStat.isFile()) {
				folderHash.update(fs.readFileSync(fullPath));
			}
		});
	}

	hashDirectory(directory);
	return folderHash.digest("hex");
}

/**
 * Reloads event listeners for the bot.
 * This function dynamically loads event files from the `./discord/Events` directory and registers them with the bot client.
 *
 * @function reloadEvents
 * @memberof module:discord
 */
function reloadEvents() {
	log.info("Reloading events...");
	globalThis.botEvents = {};

	fs.readdirSync("./discord/Events").forEach((file) => {
		if (require.resolve("./discord/Events/" + file)) {
			delete require.cache[require.resolve("./discord/Events/" + file)];
		}
		BotEvents[file.split(".")[0]] = require("./discord/Events/" + file);
	});
	log.info("Events loaded");
	Object.keys(BotEvents).forEach((key) => {
		discord.client.removeAllListeners(Events[key]);
		discord.client.on(Events[key], (event) => {
			BotEvents[key].run(event);
		});
		log.info(`Event listener registered for: ${key}`);
	});
	log.info("Events registered");
}

/**
 * Dynamically reloads command modules.
 * This function scans the `./discord/commands` directory and loads valid commands into the bot's global `botCommands` collection.
 *
 * @function reloadcommands
 * @memberof module:discord
 */
function reloadcommands() {
	log.info("Reloading commands...");

	globalThis.botCommands = new Collection();
	var commandsPath = path.resolve(__dirname, "./discord/commands");

	fs.readdirSync(commandsPath).forEach((file) => {
		var filePath = path.join(commandsPath, file);
		if (require.resolve(filePath)) {
			delete require.cache[require.resolve(filePath)];
		}
		var command = require(filePath);

		if (command.data && command.execute) {
			botCommands.set(command.data.name, command);
			log.info(`Command "${command.data.name}" successfully loaded.`);
		} else {
			log.info(`Skipping file "${file}" as it's not a valid command.`);
		}
	});

	log.info(`Available commands: ${[...botCommands.keys()].join(", ")}`);
	log.info("commands reloaded successfully.");
}

/**
 * Registers all commands with the discord API.
 * This function sends the bot's command data to discord, making it available for use in specific guilds.
 *
 * @async
 * @function registercommands
 * @memberof module:discord
 */
globalThis.registercommands = async function () {
	log.info("Registering application commands...");
	log.info("commands stored in botCommands Collection:");
	botCommands.forEach((cmd, key) => {
		log.info(`Command Key: ${key}, Command Details: ${JSON.stringify(cmd)}`);
	});

	var commands = [];
	botCommands.forEach((cmd, key) => {
		log.info(`Processing command: ${key}`);
		if (!cmd.data || !(cmd.data.toJSON instanceof Function)) {
			log.info(`Error: Command "${key}" does not provide a valid 'data.toJSON()'. Skipping it.`);
			return;
		}

		try {
			var jsonData = cmd.data.toJSON();
			log.info(`Generated JSON for command "${key}": ${JSON.stringify(jsonData)}`);
			commands.push(jsonData);
			log.info(`Command "${key}" added to commands array.`);
		} catch (err) {
			log.info(`Error while generating JSON for command "${key}": ${err.message}`);
		}
	});

	log.info(`Final commands to be registered: ${JSON.stringify(commands)}`);

	var rest = new REST({ version: "10" }).setToken(globalThis.config.discord.token);
	try {
		await rest.put(Routes.applicationGuildcommands(globalThis.discord.client.user.id, "1359169971611111736"), { body: commands });
		log.info("commands registered to discord successfully.");
	} catch (error) {
		log.info(`Error registering commands to discord: ${error.message}`);
	}
};

/**
 * Objects and functions exported by the module.
 * @type {Object}
 * @memberof module:discord
 */
module.exports = {
	/**
	 * Initializes the discord client and logs the bot in using the token retrieved from the config.
	 *
	 * @async
	 * @function init
	 * @memberof module:discord
	 */
	init: function () {
		log.info("Initializing bot...");
		globalThis.discord = {
			client: new Client({ intents: Object.values(GatewayIntentBits) }),
		};
		globalThis.botCommands = new Collection();
	},
	/**
	 * Starts the discord bot
	 *
	 * @async
	 * @function start
	 * @memberof module:discord
	 */
	start: function () {
		log.info("Starting bot...");
		reloadEvents();
		reloadcommands();
		var lastRepoHash = computeRepoHash();
		globalThis.discord.client.login(globalThis.config.discord.token);
		log.info("Bot started");
		async function timers() {
			var newRepoHash = computeRepoHash();
			log.info(newRepoHash);
			if (newRepoHash !== lastRepoHash) {
				log.info("Changes detected in the repository. Reloading Events and commands...");
				lastRepoHash = newRepoHash;

				reloadEvents();
				reloadcommands();
			} else {
				log.info("No changes detected.");
			}
			setTimeout(timers, 10000);
		}
		timers();
	},
};
