var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var ejs = require('ejs')
var { exec } = require('child_process');
var Utils = require('./../utils')

const log = new Utils.log.log(colors.green("Sandustry.web.pages.upload"), "./sandustry.web.main.txt", true);

module.exports = {
    paths: ['/uploadmod'],
    run: function (req,res){
        if(req.method != "POST"){

        }else{
            res.writeHead(404, {"Content-Type": "text/html"})
            res.end("This is an api endpoint.")
        }
    }
}