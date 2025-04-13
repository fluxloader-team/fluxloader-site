var { Client, Events, GatewayIntentBits,REST, Routes, Collection} = require('discord.js');
var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var { exec } = require('child_process');
var Utils = require('./utils')
var path = require('path');

var log = new Utils.log.log(colors.green("Sandustry.bot.main"), "./sandustry.bot.main.txt", true);

process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

globalThis.BotEvents = {
    "eventName":{
        run: function (event){}
    }
}
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
        Discord.client.on(Events[key], (event)=>{BotEvents[key].run(event)})
        log.log(`Event listener registered for: ${key}`);
    })
    log.log("Events registered")
}
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


module.exports = {
    init: function () {
        log.log("Initializing bot...")
        globalThis.Discord = {
            client: new Client({ intents: Object.values(GatewayIntentBits)})
        }
        globalThis.BotCommands = new Collection();


    },
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