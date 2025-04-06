var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var ejs = require('ejs')
var {exec} = require('child_process');
var Utils = require('./../utils')
var {MongoClient} = require("mongodb");
var {compress} = require("@mongodb-js/zstd");
var https = require('https');
var JSZip = require("jszip");
var log = new Utils.log.log(colors.green("Sandustry.web.pages.search"), "./sandustry.web.main.txt", true);
var mongoUri = globalThis.Config.mongodb.uri;
var sanitizeHtml = require('sanitize-html');
module.exports = {
    paths: ['/mods'],
    run: async function (req, res) {
        var queryurl = req.url.split('?')[1]
        var query = queryurl.split('&')
        var querys = {}
        query.forEach(function (urlvar) {
            var varsplit = urlvar.split('=')
            querys[varsplit[0]] = varsplit[1]
        })
        if (querys["search"] == undefined && (["modid"] == undefined || querys["option"] == undefined)) {
            res.writeHead(502, {"Content-Type": "text/html"});
            res.end(JSON.stringify({
                    error: "Missing required query parameters",
                    missing: {
                        modid: querys["modid"] === undefined,
                        option: querys["option"] === undefined
                    }
                })
            );
            return;
        }
        if (querys["search"] !== undefined && (["modid"] !== undefined || querys["option"] !== undefined)) {
            res.writeHead(502, {"Content-Type": "text/html"});
            res.end(JSON.stringify({
                    error: "Incorrect query parameters. Cannot use both search and modid/option.",
                parameters: {
                        search: querys["search"] === undefined,
                        modid: querys["modid"] === undefined,
                        option: querys["option"] === undefined
                    }
                })
            );
            return;
        }
        await client.connect();
        var db = client.db("SandustryMods");
        var modsCollection = db.collection("Mods");
        var versionsCollection = db.collection("ModVersions");
        if(querys["search"] == undefined){
            switch (querys["option"]) {
                case "download":

                    break;
                case "info":

                    break;
                case "versions":

                    break;
                default:
            }
        }else {
            try {
                var searchQuery = decodeURIComponent(querys["search"]);

                var queryCriteria = {};

                var conditions = searchQuery.split(" ");
                for (let condition of conditions) {
                    var [key, value] = condition.split(":");

                    switch (key) {
                        case "author":
                            queryCriteria["modinfo.author"] = { $regex: new RegExp(value, "i") };
                            break;

                        case "tags":
                            var tagsArray = value.split(",");
                            queryCriteria["modinfo.tags"] = { $all: tagsArray.map(tag => new RegExp(tag, "i")) };
                            break;

                        case "name":
                            queryCriteria["modinfo.name"] = { $regex: new RegExp(value, "i") };
                            break;

                        default:
                            log.log(`Unknown search field: ${key}`);
                            break;
                    }
                }

                var mods = await modsCollection.find(queryCriteria).toArray();

                if (mods.length === 0) {
                    res.writeHead(201, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        message: "No mods found matching your search query.",
                        searchQuery
                    }));
                    return;
                }

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    message: "Search results successfully fetched",
                    resultsCount: mods.length,
                    mods
                }));
            } catch (error) {
                console.error("Error occurred while searching mods:", error);

                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    error: "An error occurred while processing your search.",
                    details: error.message
                }));
            }

        }

    }
}
