/**
 * @file index.js
 * @description The main entry point of the Sandustry mod site application.
 */

var http = require("http");
var crypto = require("crypto");
var fs = require("fs");
var { exec } = require("child_process");
var Utils = require("./utils");
var path = require("path");
var discord = require("./discordbot.js");

/**
 * Functions related to the web server and its routes.
 * @module web
 */

/**
 * Global API-related functions.
 * @module api
 */

/**
 * Timed tasks and scheduled functionality.
 * @module timers
 */

/**
 * Main application functions and integrations.
 * @module main
 */

const CONFIG_PATH = path.join(__dirname, "config.json");

/**
 * A global configuration object that stores application-wide settings, loaded from `config.json` or defaults if not found.
 * This object is used across the application for configuring behavior, such as discord bot settings, MongoDB connection details, and other core features.
 *
 * @global
 * @namespace Config
 * @property {Object} discord - discord bot-related configuration.
 * @property {string} discord.clientId - The client ID for the discord application.
 * @property {string} discord.clientSecret - The client secret for the discord application.
 * @property {string} discord.redirectUri - The callback URL for discord OAuth authentication.
 * @property {string} discord.token - The bot token used to authenticate with discord.
 * @property {boolean} discord.runbot - Whether the discord bot should run on application startup.
 * @property {boolean} discord.serverLog - Whether the discord bot should log server activities.
 * @property {string} discord.serverLogChannel - The ID of the discord channel where server logs will be sent.
 * @property {Object} mongodb - MongoDB-related configuration.
 * @property {string} mongodb.uri - The connection URI for the MongoDB database.
 * @property {Object} git - Git-related configuration.
 * @property {boolean} git.pull - Whether the application should attempt to pull changes from the Git repository on startup.
 * @property {Object} ModSettings - Settings specific to mod validation.
 * @property {number} ModSettings.validationTime - Time (in seconds) required for a mod to be considered valid.
 *
 * @example
 * // Accessing values from globalThis.config
 * console.log(globalThis.config.discord.clientId); // Outputs the discord Client ID
 * console.log(globalThis.config.mongodb.uri); // Outputs the MongoDB URI
 *
 * @example
 * // Example of modifying globalThis.config at runtime
 * globalThis.config.git.pull = false; // Disable automatic git pull
 */
globalThis.config = {};

/**
 * Default configuration for the application. This is written to `config.json` if no file exists.
 * @type {Object}
 * @memberof module:main
 */
const DEFAULT_CONFIG = {
	discord: {
		clientId: "CLIENT_ID",
		clientSecret: "CLIENT_SECRET",
		redirectUri: "https://example.com/auth/discord/callback",
		token: "TOKEN",
		runbot: false,
		serverLog: true,
		serverLogChannel: "SERVER_LOG_CHANNEL",
		serverActionsChannel: "SERVER_ACTIONS_CHANNEL",
	},
	mongodb: {
		uri: "mongodb://localhost:27017/somejoinstring",
	},
	git: {
		pull: true,
	},
	ModSettings: {
		validationTime: 172800,
	},
};

var lastRepoHash = "";

globalThis.config = DEFAULT_CONFIG;
const log = new Utils.Log("sandustry.web.main", "./sandustry.web.main.txt", true);

process.on("uncaughtException", function (err) {
	log.info(`Caught exception: ${err.stack}`);
});

if (!fs.existsSync(CONFIG_PATH)) {
	log.info("Config file not found, generating default config.json...");
	fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
	log.info("Default config.json generated.");
	process.exit(0);
}

globalThis.config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));

/**
 * Global object to hold templates loaded into memory.
 * @memberof module:web
 */
globalThis.templates = { filename: "content" };

/**
 * Global object to store all dynamically loaded web pages.
 * @type {Object}
 * @memberof module:web
 */
var pages = {
	"/": {
		run: function (req, res) {},
	},
};

/**
 * Function to load template files into memory.
 *
 * @memberof module:web
 * @function LoadTemplates
 */
function loadTemplates() {
	log.info("Loading templates");
	fs.readdirSync("./templates").forEach((file) => {
		templates[file] = fs.readFileSync("./templates/" + file, "utf8");
	});
	log.info("Templates loaded");
}

/**
 * Function to load dynamically defined pages from the `pages` directory.
 *
 * @memberof module:web
 * @function LoadPages
 */
function loadPages() {
	log.info("Loading pages");
	fs.readdirSync("./pages").forEach((file) => {
		if (require.resolve("./pages/" + file)) {
			delete require.cache[require.resolve("./pages/" + file)];
		}
		var temprequire = require("./pages/" + file);
		temprequire.paths.forEach((path) => {
			pages[path] = temprequire;
		});
	});
	log.info("pages loaded");
}

/**
 * Global array to store all loaded timer tasks.
 * @type {Array}
 * @memberof module:timers
 */
globalThis.timers = [];

/**
 * Function to dynamically load all timer tasks from the `timers` directory and store them globally.
 *
 * @memberof module:timers
 * @function Loadtimers
 */
function loadTimers() {
	log.info("Loading timers");
	timers = [];
	fs.readdirSync("./timers").forEach((file) => {
		if (require.resolve("./timers/" + file)) {
			delete require.cache[require.resolve("./timers/" + file)];
		}
		timers.push(require("./timers/" + file));
	});
}

/**
 * Computes a hash of the files within the specified directory to track changes in the repository.
 *
 * @function computeRepoHash
 * @memberof module:main
 * @param {string} [directory='./'] - The directory to hash. Defaults to the current folder.
 * @returns {string} A SHA-256 hash representing the state of the specified directory.
 */
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
/**
 * Performs a `git pull` to update the repository, then reloads templates, pages, and timers if changes are detected.
 *
 * @function performUpdate
 * @memberof module:main
 */
async function performUpdate() {
	const updateIfHashChanged = () => {
		const newRepoHash = computeRepoHash();
		log.info(newRepoHash);
		if (newRepoHash !== lastRepoHash) {
			log.info("Changes detected in the repository. Reloading templates and pages...");
			lastRepoHash = newRepoHash;
			loadTemplates();
			loadPages();
			loadTimers();
		} else {
			log.info("No changes detected.");
		}
	};
	if (globalThis.config.git.pull) {
		exec("git pull", (error, stdout, stderr) => {
			updateIfHashChanged();
		});
	} else {
		updateIfHashChanged();
	}
	for (const timer of timers) {
		await timer.run();
	}
	setTimeout(performUpdate, 10000);
}

lastRepoHash = computeRepoHash();
log.info(lastRepoHash);
loadTemplates();
loadPages();
loadTimers();

function webRequestHandler(req, res) {
	var url = req.url;
	var urlSplit = url.split("?");
	var urlName = urlSplit[0];
	var page = pages[urlName];
	if (page) {
		page.run(req, res);
	} else {
		res.writeHead(404, { "Content-Type": "text/html" });
		res.end("404");
	}
}

setTimeout(performUpdate, 10000);

if (globalThis.config.discord.runbot) {
	try {
		discord.init();
		discord.start();
	} catch (error) {
		log.info(`Error initializing or starting discord bot: ${error.stack}`);
	}
}

http.createServer(webRequestHandler).listen(20221);
