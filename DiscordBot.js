/**
 * @file DiscordBot.js
 * @description The main module for handling Discord bot functionality, including commands, events, and integration with the Discord API.
 * This is the central module for all Discord-related namespaces in the application.
 */

/**
 * discord bot stuff
 * @module discord
 */
/**
 * Namespace for Discord bot events handling.
 * @namespace Events
 * @memberof module:discord
 */
/**
 * Namespace for Discord bot command handling.
 * @namespace Commands
 * @memberof module:discord
 */

var { Client, Events, GatewayIntentBits,REST, Routes, Collection} = require('discord.js');
var colors = require('colors');
var crypto = require("crypto")
var fs = require('fs')
var Utils = require('./utils')
var path = require('path');

var log = new Utils.log.log("Sandustry.bot.main", "./sandustry.bot.main.txt", true);

process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

/**
 * Default structure for bot events.
 * @namespace BotEvents
 * @memberof module:discord
 * @property {Object} eventName - Placeholder for an event.
 * @property {Function} eventName.run - The function to execute for the event.
 */
globalThis.BotEvents = {
    "eventName":{
        run: function (event){}
    }
}

/**
 * Computes a hash of the repository directory.
 * This provides a unique checksum for versioning or verifying the state of a directory.
 *
 * @function computeRepoHash
 * @memberof module:discord
 * @param {string} [directory='./'] - The directory to hash.
 * @returns {string} The SHA-256 hash of the given directory.
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
 * Reloads event listeners for the bot.
 * This function dynamically loads event files from the `./Discord/Events` directory and registers them with the bot client.
 *
 * @function reloadEvents
 * @memberof module:discord
 */
function reloadEvents(){
    log.log("Reloading events...")
    globalThis.BotEvents = {}

    fs.readdirSync( "./Discord/Events").forEach(file => {
        if(require.resolve("./Discord/Events/"+file)){
            delete require.cache[require.resolve("./Discord/Events/"+file)]
        }
        BotEvents[file.split(".")[0]]= require("./Discord/Events/"+file)
    })
    log.log("Events loaded")
    Object.keys(BotEvents).forEach(key => {
        Discord.client.removeAllListeners(Events[key])
        Discord.client.on(Events[key], (event)=>{BotEvents[key].run(event)})
        log.log(`Event listener registered for: ${key}`);
    })
    log.log("Events registered")
}
/**
 * Dynamically reloads command modules.
 * This function scans the `./Discord/Commands` directory and loads valid commands into the bot's global `BotCommands` collection.
 *
 * @function reloadCommands
 * @memberof module:discord
 */
function reloadCommands() {
    log.log("Reloading commands...");

    globalThis.BotCommands = new Collection();
    var commandsPath = path.resolve(__dirname, "./Discord/Commands");

    fs.readdirSync(commandsPath).forEach(file => {
        var filePath = path.join(commandsPath, file);
        if (require.resolve(filePath)) {
            delete require.cache[require.resolve(filePath)]; 
        }
        var command = require(filePath);

        if (command.data && command.execute) {
            BotCommands.set(command.data.name, command);
            log.log(`Command "${command.data.name}" successfully loaded.`);
        } else {
            log.log(`Skipping file "${file}" as it's not a valid command.`);
        }
    });

    log.log(`Available Commands: ${[...BotCommands.keys()].join(', ')}`);
    log.log("Commands reloaded successfully.");
}

/**
 * Registers all commands with the Discord API.
 * This function sends the bot's command data to Discord, making it available for use in specific guilds.
 *
 * @async
 * @function registerCommands
 * @memberof module:discord
 */
globalThis.registerCommands = async function () {
    log.log("Registering application commands...");
    log.log("Commands stored in BotCommands Collection:");
    BotCommands.forEach((cmd, key) => {
        log.log(`Command Key: ${key}, Command Details: ${JSON.stringify(cmd)}`);
    });

    var commands = [];
    BotCommands.forEach((cmd, key) => {
        log.log(`Processing command: ${key}`);
        if (!cmd.data || !(cmd.data.toJSON instanceof Function)) {
            log.log(`Error: Command "${key}" does not provide a valid 'data.toJSON()'. Skipping it.`);
            return;
        }

        try {
            var jsonData = cmd.data.toJSON();
            log.log(`Generated JSON for command "${key}": ${JSON.stringify(jsonData)}`);
            commands.push(jsonData);
            log.log(`Command "${key}" added to commands array.`);
        } catch (err) {
            log.log(`Error while generating JSON for command "${key}": ${err.message}`);
        }
    });

    log.log(`Final Commands to be registered: ${JSON.stringify(commands)}`);

    var rest = new REST({ version: '10' }).setToken(globalThis.Config.discord.token);
    try {
        await rest.put(
            Routes.applicationGuildCommands(globalThis.Discord.client.user.id, "1359169971611111736"),
            { body: commands }
        );
        log.log("Commands registered to Discord successfully.");
    } catch (error) {
        log.log(`Error registering commands to Discord: ${error.message}`);
    }
};

/**
 * Objects and functions exported by the module.
 * @type {Object}
 * @memberof module:discord
 */
module.exports = {
    /**
     * Initializes the Discord client and logs the bot in using the token retrieved from the config.
     *
     * @async
     * @function init
     * @memberof module:discord
     */
    init: function () {
        log.log("Initializing bot...")
        globalThis.Discord = {
            client: new Client({ intents: Object.values(GatewayIntentBits)})
        }
        globalThis.BotCommands = new Collection();


    },
    /**
     * Starts the Discord bot
     *
     * @async
     * @function start
     * @memberof module:discord
     */
    start:function (){
        log.log("Starting bot...")
        reloadEvents();
        reloadCommands();
        var lastRepoHash = computeRepoHash();
        globalThis.Discord.client.login(globalThis.Config.discord.token)
        log.log("Bot started")
        setInterval(()=>{
            var newRepoHash = computeRepoHash();
            log.log(newRepoHash)
            if (newRepoHash !== lastRepoHash) {
                log.log('Changes detected in the repository. Reloading Events and Commands...');
                lastRepoHash = newRepoHash;

                reloadEvents()
                reloadCommands()
            } else {
                log.log('No changes detected.');
            }

        }, 10000)
    }
}