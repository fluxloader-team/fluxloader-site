const { Client, Events, GatewayIntentBits } = require('discord.js');
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

module.exports = {
    init: function () {
        log.log("Initializing bot...")
        globalThis.Discord = {
            client: new Client({ intents: [GatewayIntentBits.Guilds] })
        }

    },
    start:function (){
        log.log("Starting bot...")
        reloadEvents();
        globalThis.Discord.client.login(globalThis.Config.discord.token)
        log.log("Bot started")
        setInterval(reloadEvents, 10000)
    }
}