var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var Utils = require('./utils')

const log = new Utils.log.log(colors.green("Sandustry.web.main"), "./sandustry.web.main.txt", true);

process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

var Templates = {}

var LoadTemplates = function (){
    log.log("Loading templates")
    fs.readdirSync( "./templates").forEach(file => {
        Templates[file] = fs.readFileSync("./templates/"+file, "utf8")
    })
    log.log("Templates loaded")
}

LoadTemplates();