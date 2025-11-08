const http = require("http");
const fs = require("fs");
const Utils = require("./common/utils.js");
const path = require("path");
const discord = require("./discord/discordbot.js");

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
		server: "1359169971611111736",
	},
	mongodb: {
		uri: "mongodb://localhost:27017/somejoinstring",
	},
	git: {
		pull: true,
	},
	modSettings: {
		validationTime: 172800,
	},
	requireGithubSecretForReload: true,
	githubSecret: null,
};

const logger = new Utils.Log("main");

globalThis.config = DEFAULT_CONFIG;
globalThis.pages = {};
globalThis.templates = {};
globalThis.public = {};
globalThis.timers = [];
globalThis.server = null;

// --------------------------------------------------------------------------------------

function loadConfig() {
	if (!fs.existsSync(CONFIG_PATH)) {
		logger.info("Config file not found, generating default config.json...");
		fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2), "utf-8");
	}

	globalThis.config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

function loadResources() {
	let pageNames = [];
	fs.readdirSync(path.join(__dirname, "./site/pages"), { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		pageNames.push(entry.name);
		const filePath = path.resolve(entry.parentPath, entry.name);
		const fileModule = require(filePath);
		fileModule.paths.forEach((path) => (pages[path] = fileModule));
	});

	logger.info(`pages loaded: [ ${pageNames.join(", ")} ]`);

	let templateFileNames = [];
	fs.readdirSync(path.join(__dirname, "./site/templates"), { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		templateFileNames.push(entry.name);
		const filePath = path.resolve(entry.parentPath, entry.name);
		templates[entry.name] = fs.readFileSync(filePath, "utf8");
	});

	logger.info(`templates loaded: [ ${templateFileNames.join(", ")} ]`);

	let publicFileNames = [];
	fs.readdirSync(path.join(__dirname, "./site/public"), { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		publicFileNames.push(entry.name);
		const filePath = path.resolve(entry.parentPath, entry.name);
		public[entry.name] = fs.readFileSync(filePath, "utf8");
	});

	logger.info(`public files loaded: [ ${publicFileNames.join(", ")} ]`);

	let timerNames = [];
	fs.readdirSync(path.join(__dirname, "./timers"), { withFileTypes: true, recursive: true }).forEach((entry) => {
		if (entry.isDirectory()) return;
		timerNames.push(entry.name);
		const filePath = path.resolve(entry.parentPath, entry.name);
		const fileModule = require(filePath);
		timers.push(fileModule);
	});

	logger.info(`Timers loaded: [ ${timerNames.join(", ")} ]`);
}

/**
 * @param {import("http").IncomingMessage} req
 * @param {import("http").ServerResponse} res
 */
function handleWebRequests(req, res) {
	var url = req.url;
	var urlSplit = url.split("?");
	var urlName = urlSplit[0];

	var page = pages[urlName];
	if (page) {
		logger.debug(`Received request for page: ${url}`);
		return page.run(req, res);
	}

	var publicFile = public[urlName.replace("/", "")];
	if (publicFile) {
		const type = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript" }[path.extname(urlName)] || "text/html";
		logger.debug(`Received request for public file: ${url} (Content-Type: ${type})`);
		res.writeHead(200, { "Content-Type": type });
		res.end(publicFile);
		return;
	}

	logger.debug(`Requested resource not found: ${url}`);
	res.writeHead(404, { "Content-Type": "text/html" });
	res.end("404");
}

function main() {
	logger.info("Starting the fluxloader site");

	process.on("uncaughtException", function (err) {
		logger.info(`Caught exception: ${err.stack}`);
	});

	process.on("SIGTERM", async () => {
		logger.info("Received SIGTERM, shutting down...");
		if (globalThis.globalClient) {
			await globalThis.globalClient.close();
			globalThis.globalClient = null;
		}
		if (globalThis.server) {
			globalThis.server.close(() => process.exit(0));
		} else {
			process.exit(0);
		}
	});

	loadConfig();
	loadResources();

	if (globalThis.config.discord.runbot) {
		discord.run();
	}

	globalThis.server = http.createServer(handleWebRequests);
	globalThis.server.listen(20221);

	setInterval(() => {
		for (const timer of timers) {
			timer.run();
		}
	}, 5000);

	logger.info("Server started: http://localhost:20221");
}

main();
