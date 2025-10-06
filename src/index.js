var http = require("http");
var crypto = require("crypto");
var fs = require("fs");
var { exec } = require("child_process");
var Utils = require("./common/utils.js");
var path = require("path");
var discord = require("./discord/discordbot.js");

const CONFIG_PATH = path.join(__dirname, "config.json");
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

globalThis.config = DEFAULT_CONFIG;
globalThis.pages = { "/": { run: function (req, res) {} } };
globalThis.components = { filename: "content" };
globalThis.timers = [];

var log = new Utils.Log("sandustry.web.main", "./sandustry.web.main.txt", true);
var lastRepoHash = "";

// ---------------------------------------------------------------

function setupConfig() {
	if (!fs.existsSync(CONFIG_PATH)) {
		log.info("Config file not found, generating default config.json...");
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
	}

	globalThis.config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

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

function loadComponents() {
	log.info("Loading components...");
	let names = [];

	fs.readdirSync("./components", { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		names.push(entry.name);

		const filePath = path.resolve(entry.path, entry.name);
		components[entry.name] = fs.readFileSync(filePath, "utf8");
	});

	log.info(`components loaded: [ ${names.join(", ")} ]`);
}

function loadPages() {
	log.info("Loading pages...");
	let names = [];

	fs.readdirSync("./pages", { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		names.push(entry.name);

		const filePath = path.resolve(entry.path, entry.name);
		const fileResolved = require.resolve(filePath);

		delete require.cache[fileResolved];
		var fileModule = require(filePath);
		fileModule.paths.forEach((path) => (pages[path] = fileModule));
	});

	log.info(`pages loaded: [ ${names.join(", ")} ]`);
}

function loadTimers() {
	log.info("Loading timers...");
	let names = [];

	fs.readdirSync("./timers", { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		names.push(entry.name);

		const filePath = path.resolve(entry.path, entry.name);
		const fileResolved = require.resolve(filePath);

		delete require.cache[fileResolved];
		const fileModule = require(filePath);
		timers.push(fileModule);
	});

	log.info(`Timers loaded: [ ${names.join(", ")} ]`);
}

async function performReloadCheck() {
	const updateIfHashChanged = () => {
		const newRepoHash = computeRepoHash();
		log.info(newRepoHash);

		if (newRepoHash !== lastRepoHash) {
			log.info("Changes detected in the repository. Reloading components and pages...");
			lastRepoHash = newRepoHash;
			loadComponents();
			loadPages();
			loadTimers();
		} else {
			log.info("No changes detected (index.js).");
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

	setTimeout(performReloadCheck, 10000);
}

function handleWebRequests(req, res) {
	var url = req.url;
	var urlSplit = url.split("?");
	var urlName = urlSplit[0];
	var page = pages[urlName];
	if (page) {
	log.debug(`Received request for page: ${url}`);
		page.run(req, res);
	} else {
		var component = components[urlName.replace("/", "")];
		if (component) {
			const type = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" }[path.extname(urlName)] || "text/html";
			log.debug(`Received request for component: ${url} (Content-Type: ${type})`);
			res.writeHead(200, { "Content-Type": type });
			res.end(component);
			return;
		} else {
			log.debug(`Page not found: ${url}`);
			res.writeHead(404, { "Content-Type": "text/html" });
			res.end("404");
		}
	}
}

// ---------------------------------------------------------------

function main() {
	log.info("Starting index.js for the fluxloader site");

	process.on("uncaughtException", function (err) {
		log.info(`Caught exception: ${err.stack}`);
	});

	setupConfig();

	lastRepoHash = computeRepoHash();
	log.info(lastRepoHash);

	loadComponents();
	loadPages();
	loadTimers();

	if (globalThis.config.discord.runbot) discord.run();

	setTimeout(performReloadCheck, 10000);

	http.createServer(handleWebRequests).listen(20221);

	log.info("Server started: http://localhost:20221");
}

main();
