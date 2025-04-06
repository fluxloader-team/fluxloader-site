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
var {compress,decompress} = require("@mongodb-js/zstd");
var https = require('https');
var JSZip = require("jszip");
var log = new Utils.log.log(colors.green("Sandustry.web.pages.search"), "./sandustry.web.main.txt", true);
var mongoUri = globalThis.Config.mongodb.uri;
var sanitizeHtml = require('sanitize-html');
module.exports = {
    paths: ['/mods'],
    run: async function (req, res) {
        try {
            var client = new MongoClient(mongoUri);
            var queryurl = req.url.split('?')[1]
            var query = queryurl.split('&')
            var querys = {}
            query.forEach(function (urlvar) {
                var varsplit = urlvar.split('=')
                querys[varsplit[0]] = varsplit[1]
            })
            if (querys["search"] == undefined && (querys["modid"] == undefined || querys["option"] == undefined)) {
                res.writeHead(201, {"Content-Type": "application/json"});
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
            await client.connect();
            var db = client.db("SandustryMods");
            var modsCollection = db.collection("Mods");
            var versionsCollection = db.collection("ModVersions");
            if (querys["search"] == undefined) {
                switch (querys["option"]) {
                    case "download":
                        try {
                            var modID = querys["modid"];
                            if (!modID) {
                                res.writeHead(201, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    error: "ModID is required to download the mod."
                                }));
                                return;
                            }

                            var query = { modID };

                            if (querys["version"]) {
                                query["modinfo.version"] = querys["version"];
                            }

                            var modData = await versionsCollection
                                .find(query)
                                .sort({ uploadTime: -1 })
                                .limit(1)
                                .toArray();

                            if (modData.length === 0) {
                                res.writeHead(201, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    error: "No mod version found for the specified mod ID and version.",
                                    modID,
                                    version: querys["version"] || "latest"
                                }));
                                return;
                            }
                            const diagnostics = {}; // For collecting debug information

                            try {
                                const compressedBuffer = Buffer.from(modData[0].modfile, "latin1");
                                diagnostics.compressedBufferLength = compressedBuffer.length;

                                if (compressedBuffer.length === 0) {
                                    throw new Error("Compressed buffer from Base64 is empty.");
                                }

                                const decompressedBuffer = await decompress(compressedBuffer);
                                diagnostics.decompressedBufferLength = decompressedBuffer.length;

                                if (decompressedBuffer.length === 0) {
                                    throw new Error("Decompressed buffer is empty. Zstd decompression failed.");
                                }

                                // Step 2: Base64 Decoding
                                const zipBuffer = Buffer.from(decompressedBuffer.toString(), "base64");
                                diagnostics.zipBufferLength = zipBuffer.length;

                                if (zipBuffer.length === 0) {
                                    throw new Error("Base64 decoding produced an empty buffer.");
                                }

                                // Step 3: Process ZIP File
                                const zip = await JSZip.loadAsync(zipBuffer);
                                diagnostics.fileNames = Object.keys(zip.files);

                                // Step 4: Extract Files from ZIP
                                const extractedFiles = {};
                                for (const fileName of diagnostics.fileNames) {
                                    const file = zip.files[fileName];
                                    if (!file.dir) {
                                        extractedFiles[fileName] = await file.async("text");
                                    }
                                }

                                // Step 5: Respond with Results
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.end(
                                    JSON.stringify({
                                        success: true,
                                        diagnostics,
                                        files: extractedFiles
                                    })
                                );
                            } catch (error) {
                                // Handle errors and provide diagnostics
                                diagnostics.error = error.message;
                                res.writeHead(500, { "Content-Type": "application/json" });
                                res.end(
                                    JSON.stringify({
                                        success: false,
                                        diagnostics
                                    })
                                );
                            }


                        } catch (error) {
                            log.log("Error processing mod download: " + error.message);
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({
                                error: "An error occurred while processing the download.",
                                details: error.message
                            }));
                        }

                        break;
                    case "info":
                        try {
                            var modID = querys["modid"];
                            if (!modID) {
                                res.writeHead(201, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    error: "ModID is required to fetch the mod information."
                                }));
                                return;
                            }
                            var modQuery = { modID };
                            if (querys["version"]) {
                                modQuery["modinfo.version"] = querys["version"];
                            }
                            var modVersion = await versionsCollection
                                .find(modQuery)
                                .sort({ uploadTime: -1 })
                                .project({ modfile: 0 })
                                .limit(1)
                                .toArray();

                            if (modVersion.length === 0) {
                                res.writeHead(201, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    message: "No mod version found for the specified mod ID and version.",
                                    modID,
                                    version: querys["version"] || "latest"
                                }));
                                return;
                            }

                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ mod: modVersion[0] }));
                        } catch (err) {
                            log.log("Error fetching mod info: " + err.message);
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({
                                error: "An internal server error occurred while fetching mod information.",
                                details: err.message
                            }));
                        }

                        break;
                    case "versions":
                        try {
                            var modID = querys["modid"];
                            if (!modID) {
                                res.writeHead(201, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    error: "ModID is required to fetch versions."
                                }));
                                return;
                            }

                            var versions = await versionsCollection
                                .find({ modID: modID })
                                .project({ modfile: 0 })
                                .toArray();

                            if (versions.length === 0) {
                                res.writeHead(201, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    message: "No versions found for the specified mod ID.",
                                    modID: modID
                                }));
                                return;
                            }

                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ versions }));
                        } catch (err) {
                            log.log("Error fetching versions: " + err.message);
                            res.writeHead(201, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({
                                error: "An internal server error occurred while fetching versions.",
                                details: err.message
                            }));
                        }

                        break;
                    default:
                }
            }
            else {
                try {
                    var searchQuery = decodeURIComponent(querys["search"]);

                    var queryCriteria = {};

                    var conditions = searchQuery.split(" ");
                    for (let condition of conditions) {
                        var [key, value] = condition.split(":");

                        switch (key) {
                            case "author":
                                queryCriteria["modinfo.author"] = {$regex: new RegExp(value, "i")};
                                break;

                            case "tags":
                                var tagsArray = value.split(",");
                                queryCriteria["modinfo.tags"] = {$all: tagsArray.map(tag => new RegExp(tag, "i"))};
                                break;

                            case "name":
                                queryCriteria["modinfo.name"] = {$regex: new RegExp(value, "i")};
                                break;

                            default:
                                log.log(`Unknown search field: ${key}`);
                                break;
                        }
                    }

                    var mods = await modsCollection.find(queryCriteria).toArray();

                    if (mods.length === 0) {
                        res.writeHead(201, {"Content-Type": "application/json"});
                        res.end(JSON.stringify({
                            message: "No mods found matching your search query.",
                            searchQuery
                        }));
                        return;
                    }

                    res.writeHead(201, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({
                        message: "Search results successfully fetched",
                        resultsCount: mods.length,
                        mods
                    }));
                } catch (error) {
                    log.log("Error occurred while searching mods:", error);

                    res.writeHead(201, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({
                        error: "An error occurred while processing your search.",
                        details: error.message
                    }));
                }

            }
        } catch (error) {
            res.writeHead(201, {"Content-Type": "application/json"});
            res.end(JSON.stringify({
                error: "An error occurred while processing your request.",
                details: error.message
            }));
        }

    }
}
