const { Client, Events, GatewayIntentBits,REST, Routes} = require('discord.js');
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

const log = new Utils.log.log(colors.green("Sandustry.bot.main"), "./sandustry.bot.main.txt", true);

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
        Discord.client.on(Events[key], BotEvents[key].run)
    })
    log.log("Events registered")
}
function reloadCommands() {
    log.log("Reloading commands...");

    globalThis.BotCommands = new Map();
    const commandsPath = "./Discord/Commands";

    fs.readdirSync(commandsPath).forEach(file => {
        if (require.resolve(`${commandsPath}/${file}`)) {
            delete require.cache[require.resolve(`${commandsPath}/${file}`)];
        }
        const command = require(`${commandsPath}/${file}`);
        if (command.data && command.execute) {
            BotCommands.set(command.data.name, command);
        }
    });
    log.log(`Available Commands: ${[...BotCommands.keys()].join(', ')}`);
    log.log("Commands reloaded successfully.");
}

globalThis.registerCommands = async function() {
    log.log("Registering application commands...");
    const commands = [...BotCommands.values()].map(cmd => cmd.data.toJSON());

    const rest = new REST({ version: '10' }).setToken(globalThis.Config.discord.token);
    try {
        await rest.put(
            Routes.applicationGuildCommands(globalThis.Discord.client.user.id,"1359169971611111736"),
            { body: commands }
        );
        log.log("Commands registered to Discord.");
        var commandslist = await rest.get(Routes.applicationGuildCommands(globalThis.Discord.client.user.id, '1359169971611111736'));
        log.log('Registered commands:', commandslist);

    } catch (error) {
        log.log(`Error registering commands: ${error}`);
    }
}

module.exports = {
    init: function () {
        log.log("Initializing bot...")
        globalThis.Discord = {
            client: new Client({ intents: Object.values(GatewayIntentBits)})
        }
        globalThis.BotCommands = new Map();


    },
    start:function (){
        log.log("Starting bot...")
        reloadEvents();
        reloadCommands();
        var lastRepoHash = computeRepoHash();
        globalThis.Discord.client.login(globalThis.Config.discord.token)
        log.log("Bot started")
        setInterval(()=>{
            const newRepoHash = computeRepoHash();
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