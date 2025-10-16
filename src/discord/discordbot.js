const { Client, Events, GatewayIntentBits, REST, Routes, Collection } = require("discord.js");
const crypto = require("crypto");
const fs = require("fs");
const Utils = require("../common/utils.js");
const path = require("path");

const logger =new Utils.Log("sandustry.bot.main", "./sandustry.bot.main.txt", true);

process.on("uncaughtException", function (err) {
	logger.info(`Caught exception: ${err.stack}`);
});

globalThis.botEvents = {
	eventName: {
		run: function (event) {},
	},
};

function computeRepoHash(directory = "./") {
	var folderHash = crypto.createHash("sha256");

	function hashDirectory(dir) {
		var files = fs.readdirSync(dir);
		files.forEach((file) => {
			var fullPath = path.join(dir, file);
			var fileStat = fs.statSync(fullPath);

			if (fileStat.isDirectory()) {
				// Ignore node_modules and .git directories
				if (file === "node_modules" || file === ".git") {
					return;
				}

				hashDirectory(fullPath);
			} else if (fileStat.isFile()) {
				// Ignore .txt
				if (file.endsWith(".txt")) {
					return;
				}

				folderHash.update(fs.readFileSync(fullPath));
			}
		});
	}

	hashDirectory(directory);
	return folderHash.digest("hex");
}

function reloadEvents() {
	logger.info("Reloading events...");
	globalThis.botEvents = {};

	fs.readdirSync("./discord/Events").forEach((file) => {
		if (require.resolve("./discord/Events/" + file)) {
			delete require.cache[require.resolve("./discord/Events/" + file)];
		}
		botEvents[file.split(".")[0]] = require("./discord/Events/" + file);
	});
	logger.info("Events loaded");
	Object.keys(botEvents).forEach((key) => {
		discord.client.removeAllListeners(Events[key]);
		discord.client.on(Events[key], (event) => {
			botEvents[key].run(event);
		});
		logger.info(`Event listener registered for: ${key}`);
	});
	logger.info("Events registered");
}

function reloadcommands() {
	logger.info("Reloading commands...");

	globalThis.botCommands = new Collection();
	var commandsPath = path.resolve(__dirname, "./discord/commands");

	fs.readdirSync(commandsPath).forEach((file) => {
		var filePath = path.join(commandsPath, file);
		if (require.resolve(filePath)) {
			delete require.cache[require.resolve(filePath)];
		}
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

globalThis.registercommands = async function () {
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
		await rest.put(Routes.applicationGuildcommands(globalThis.discord.client.user.id, "1359169971611111736"), { body: commands });
		logger.info("commands registered to discord successfully.");
	} catch (error) {
		logger.info(`Error registering commands to discord: ${error.message}`);
	}
};

module.exports = {
	run: function () {
		try {
			logger.info("Starting discord bot...");
			globalThis.discord = {
				client: new Client({ intents: Object.values(GatewayIntentBits) }),
			};
			globalThis.botCommands = new Collection();
			reloadEvents();
			reloadcommands();
			globalThis.discord.client.login(globalThis.config.discord.token);

			logger.info("discord bot started");

			var lastRepoHash = computeRepoHash();

			async function timers() {
				var newRepoHash = computeRepoHash();
				logger.info(newRepoHash);
				if (newRepoHash !== lastRepoHash) {
					logger.info("Changes detected in the repository. Reloading Events and commands...");
					lastRepoHash = newRepoHash;
					reloadEvents();
					reloadcommands();
				} else {
					logger.info("No changes detected (discordbot.js).");
				}
				setTimeout(timers, 10000);
			}

			timers();
		} catch (error) {
			logger.info(`Error initializing or starting discord bot: ${error.stack}`);
		}
	},
};
