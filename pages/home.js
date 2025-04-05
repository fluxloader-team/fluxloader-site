var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var Utils = require('./../utils')

const log = new Utils.log.log(colors.green("Sandustry.web.pages.home"), "./sandustry.web.main.txt", true);

module.exports = {
    paths: ['','/','/home'],
    run: function (req,res){
        res.writeHead(201, {"Content-Type": "text/html"})
        res.end(ejs.render(globalThis.Templates["base.ejs"], { data: [globalThis.Templates["basicheaders.html"],globalThis.Templates["home.html"]] }))
    }
}