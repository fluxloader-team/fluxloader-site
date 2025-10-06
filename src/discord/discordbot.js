var { Client, Events, GatewayIntentBits, REST, Routes, Collection } = require("discord.js");
var crypto = require("crypto");
var fs = require("fs");
var Utils = require("../common/utils.js");
var path = require("path");

var log = new Utils.Log("sandustry.bot.main", "./sandustry.bot.main.txt", true);

process.on("uncaughtException", function (err) {
	log.info(`Caught exception: ${err.stack}`);
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
	log.info("Reloading events...");
	globalThis.botEvents = {};

	fs.readdirSync("./discord/Events").forEach((file) => {
		if (require.resolve("./discord/Events/" + file)) {
			delete require.cache[require.resolve("./discord/Events/" + file)];
		}
		botEvents[file.split(".")[0]] = require("./discord/Events/" + file);
	});
	log.info("Events loaded");
	Object.keys(botEvents).forEach((key) => {
		discord.client.removeAllListeners(Events[key]);
		discord.client.on(Events[key], (event) => {
			botEvents[key].run(event);
		});
		log.info(`Event listener registered for: ${key}`);
	});
	log.info("Events registered");
}

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

module.exports = {
	run: function () {
		try {
			log.info("Starting discord bot...");
			globalThis.discord = {
				client: new Client({ intents: Object.values(GatewayIntentBits) }),
			};
			globalThis.botCommands = new Collection();
			reloadEvents();
			reloadcommands();
			globalThis.discord.client.login(globalThis.config.discord.token);

			log.info("discord bot started");

			var lastRepoHash = computeRepoHash();

			async function timers() {
				var newRepoHash = computeRepoHash();
				log.info(newRepoHash);
				if (newRepoHash !== lastRepoHash) {
					log.info("Changes detected in the repository. Reloading Events and commands...");
					lastRepoHash = newRepoHash;
					reloadEvents();
					reloadcommands();
				} else {
					log.info("No changes detected (discordbot.js).");
				}
				setTimeout(timers, 10000);
			}

			timers();
		} catch (error) {
			log.info(`Error initializing or starting discord bot: ${error.stack}`);
		}
	},
};
