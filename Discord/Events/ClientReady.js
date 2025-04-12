const { Client, Events, GatewayIntentBits } = require('discord.js');
var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var { exec } = require('child_process');
var Utils = require('./../utils')
var path = require('path');

const log = new Utils.log.log(colors.green("Sandustry.bot.event.ClientReady"), "./sandustry.bot.main.txt", true);
process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

module.exports = {
    run: function (readyClient) {
        log.log("Client ready!");
    }
}