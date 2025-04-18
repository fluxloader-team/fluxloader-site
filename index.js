/**
 * @file index.js
 * @description The main entry point of the Sandustry mod site application.
 */

var colors = require('colors');
var http = require("http")
var crypto = require("crypto")
var fs = require('fs')
var { exec } = require('child_process');
var Utils = require('./utils')
var path = require('path');
var Discord = require('./DiscordBot.js');

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

const CONFIG_PATH = path.join(__dirname, 'config.json');
/**
 * A global configuration object that stores application-wide settings, loaded from `config.json` or defaults if not found.
 * This object is used across the application for configuring behavior, such as Discord bot settings, MongoDB connection details, and other core features.
 *
 * @global
 * @namespace Config
 * @property {Object} discord - Discord bot-related configuration.
 * @property {string} discord.clientId - The client ID for the Discord application.
 * @property {string} discord.clientSecret - The client secret for the Discord application.
 * @property {string} discord.redirectUri - The callback URL for Discord OAuth authentication.
 * @property {string} discord.token - The bot token used to authenticate with Discord.
 * @property {boolean} discord.runbot - Whether the Discord bot should run on application startup.
 * @property {boolean} discord.serverLog - Whether the Discord bot should log server activities.
 * @property {string} discord.serverLogChannel - The ID of the Discord channel where server logs will be sent.
 *
 * @property {Object} mongodb - MongoDB-related configuration.
 * @property {string} mongodb.uri - The connection URI for the MongoDB database.
 *
 * @property {Object} git - Git-related configuration.
 * @property {boolean} git.pull - Whether the application should attempt to pull changes from the Git repository on startup.
 *
 * @property {Object} ModSettings - Settings specific to mod validation.
 * @property {number} ModSettings.validationTime - Time (in seconds) required for a mod to be considered valid.
 *
 * @example
 * // Accessing values from globalThis.Config
 * console.log(globalThis.Config.discord.clientId); // Outputs the Discord Client ID
 * console.log(globalThis.Config.mongodb.uri); // Outputs the MongoDB URI
 *
 * @example
 * // Example of modifying globalThis.Config at runtime
 * globalThis.Config.git.pull = false; // Disable automatic git pull
 */
globalThis.Config = {}
/**
 * Default configuration for the application. This is written to `config.json` if no file exists.
 * @type {Object}
 * @memberof module:main
 */
var defaultConfig = {
    discord: {
        clientId: 'CLIENT_ID',
        clientSecret: 'CLIENT_SECRET',
        redirectUri: 'https://example.com/auth/discord/callback',
        token: 'TOKEN',
        runbot: false,
        serverLog: true,
        serverLogChannel: 'SERVER_LOG_CHANNEL',
    },
    mongodb:{
        uri: 'mongodb://localhost:27017/somejoinstring',
    },
    git:{
        pull: true,
    },
    ModSettings:{
        validationTime:172800
    }
};
globalThis.Config = defaultConfig;

var lastRepoHash = '';
const log = new Utils.log.log(colors.green("Sandustry.web.main"), "./sandustry.web.main.txt", true);

process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

if (!fs.existsSync(CONFIG_PATH)) {
    log.log('Config file not found, generating default config.json...');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    log.log('Default config.json generated.');
    process.exit(0);
}
globalThis.Config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

/**
 * Global object to hold templates loaded into memory.
 * @memberof module:web
 */
globalThis.Templates = {"filename": "content"}
/**
 * Global object to store all dynamically loaded web pages.
 * @type {Object}
 * @memberof module:web
 */
var pages = {"/": {
    run: function (req,res){}
}}
/**
 * Function to load template files into memory.
 *
 * @memberof module:web
 * @function LoadTemplates
 */
var LoadTemplates = function (){
    log.log("Loading templates")
    fs.readdirSync( "./templates").forEach(file => {
        Templates[file] = fs.readFileSync("./templates/"+file, "utf8")
    })
    log.log("Templates loaded")
}
/**
 * Function to load dynamically defined pages from the `pages` directory.
 *
 * @memberof module:web
 * @function LoadPages
 */
var LoadPages = function (){
    log.log("Loading pages")
    fs.readdirSync( "./pages").forEach(file => {
        if(require.resolve("./pages/"+file)){
            delete require.cache[require.resolve("./pages/"+file)]
        }
        var temprequire = require("./pages/"+file)
        temprequire.paths.forEach(path => {
            pages[path] = temprequire;
        })

    })
    log.log("pages loaded")
}
/**
 * Global array to store all loaded timer tasks.
 * @type {Array}
 * @memberof module:timers
 */
globalThis.Timers = []
/**
 * Function to dynamically load all timer tasks from the `timers` directory and store them globally.
 *
 * @memberof module:timers
 * @function LoadTimers
 */
var LoadTimers = function (){
    log.log("Loading timers")
    fs.readdirSync( "./timers").forEach(file => {
        if(require.resolve("./timers/"+file)){
            delete require.cache[require.resolve("./timers/"+file)]
        }
        Timers.push(require("./timers/"+file))
    })
}
/**
 * Computes a hash of the files within the specified directory to track changes in the repository.
 *
 * @function computeRepoHash
 * @memberof module:main
 * @param {string} [directory='./'] - The directory to hash. Defaults to the current folder.
 * @returns {string} A SHA-256 hash representing the state of the specified directory.
 */
function computeRepoHash(directory = './') {
    var folderHash = crypto.createHash('sha256');

    function hashDirectory(dir) {
        var files = fs.readdirSync(dir);
        files.forEach(file => {
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
    return folderHash.digest('hex');
}
/**
 * Performs a `git pull` to update the repository, then reloads templates, pages, and timers if changes are detected.
 *
 * @function performUpdate
 * @memberof module:main
 */
function performUpdate() {
    if(globalThis.Config.git.pull){
        exec('git pull', (error, stdout, stderr) => {
            if (error) {
                log.log(`Error running git pull: ${error}`);
                return;
            }
            log.log(stdout);

            const newRepoHash = computeRepoHash();
            log.log(newRepoHash)
            if (newRepoHash !== lastRepoHash) {
                log.log('Changes detected in the repository. Reloading templates and pages...');
                lastRepoHash = newRepoHash;

                LoadTemplates();
                LoadPages();
                LoadTimers();
            } else {
                log.log('No changes detected.');
            }
        });
    }else{
        const newRepoHash = computeRepoHash();
        log.log(newRepoHash)
        if (newRepoHash !== lastRepoHash) {
            log.log('Changes detected in the repository. Reloading templates and pages...');
            lastRepoHash = newRepoHash;

            LoadTemplates();
            LoadPages();
            LoadTimers();
        } else {
            log.log('No changes detected.');
        }
    }
    Timers.forEach(timer => {
        timer.run();
    })

}


LoadTemplates();
LoadPages();
LoadTimers();
lastRepoHash = computeRepoHash();
log.log(lastRepoHash)
var WebRequestHandler = function (req, res){
    var url = req.url
    var urlSplit = url.split("?")
    var urlName = urlSplit[0]
    var template = pages[urlName]
    if(template){
        template.run(req, res)
    }else{
        res.writeHead(404, {"Content-Type": "text/html"})
        res.end("404")
    }
}
setInterval(performUpdate, 10000);

if (globalThis.Config.discord.runbot) {
    try {
        Discord.init();
        Discord.start();
    } catch (error) {
        log.log(`Error initializing or starting Discord bot: ${error.stack}`);
    }
}
var WebServer = http.createServer(WebRequestHandler).listen(20221)