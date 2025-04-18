var {MongoClient} = require('mongodb');
var colors = require("colors");
var Utils = require('./../utils');
const crypto = require("crypto");
const https = require("https");
const {compress} = require("@mongodb-js/zstd");
var JSZip = require("jszip");
const sanitizeHtml = require("sanitize-html");
var log = new Utils.log.log(colors.green("Sandustry.Shared.DB"), "./sandustry.Shared.txt", true);
var mongoUri = globalThis.Config.mongodb.uri;

/**
 * Represents an entry for a mod in the mod db.
 * @class
 * @memberof module:DB
 */

class modEntry {
    /**
     * The ID of the mod.
     * @type {string}
     */
    modID = ""
    /**
     * Data associated with the mod taken from mod info
     * @type {Object}
     * @property {string} modID - The ID of the mod.
     * @property {string} name - The name of the mod.
     * @property {string} version - The version of the mod.
     * @property {string} author - The author of the mod.
     * @property {string} shortDescription - A brief description of the mod.
     * @property {string} modloaderVersion - The version of the modloader required.
     * @property {Object} dependencies - The dependencies of the mod. Key-value pairs.
     * @property {string[]} tags - Tags or categories associated with the mod.
     * @property {string} electronEntrypoint - The entry point for the Electron application.
     * @property {string} browserEntrypoint - The entry point for the browser application.
     * @property {string} workerEntrypoint - The entry point for the worker process.
     * @property {Object} defaultConfig - Default configuration for the mod.
     */
    modData = {
        modID: "",
        name: "",
        version: "",
        author: "",
        shortDescription: "",
        modloaderVersion: "",
        dependencies: {
            "": "",
        },
        tags: [""],
        electronEntrypoint: "",
        browserEntrypoint: "",
        workerEntrypoint: "",
        defaultConfig: {},
    }
    /**
     * Author information.
     * @type {Object}
     * @property {string} discordID - The Discord ID of the author.
     * @property {string} discordUsername - The Discord username of the author.
     */
    Author = {
        discordID: "",
        discordUsername: "",
    }
    /**
     * The number of votes for the mod.
     * @type {number}
     */
    votes = 0
    /**
     * Whether the mod is verified.
     * @type {boolean}
     */
    verified = false
}

/**
 * Represents an entry for a mod version within the DB.
 * @class
 * @memberof module:DB
 */
class modVersionEntry {
    /**
     * The ID of the mod.
     * @type {string}
     */
    modID = ""
    /**
     * The Zip of the mod compressed with zstd.
     * @type {string}
     */
    modfile = "";
    /**
     * Data associated with the mod taken from mod info
     * @type {Object}
     * @property {string} modID - The ID of the mod.
     * @property {string} name - The name of the mod.
     * @property {string} version - The version of the mod.
     * @property {string} author - The author of the mod.
     * @property {string} shortDescription - A brief description of the mod.
     * @property {string} modloaderVersion - The version of the modloader required.
     * @property {Object} dependencies - The dependencies of the mod. Key-value pairs.
     * @property {string[]} tags - Tags or categories associated with the mod.
     * @property {string} electronEntrypoint - The entry point for the Electron application.
     * @property {string} browserEntrypoint - The entry point for the browser application.
     * @property {string} workerEntrypoint - The entry point for the worker process.
     * @property {Object} defaultConfig - Default configuration for the mod.
     */
    modData = {
        modID: "",
        name: "",
        version: "",
        author: "",
        shortDescription: "",
        modloaderVersion: "",
        dependencies: {
            "": "",
        },
        tags: [""],
        electronEntrypoint: "",
        browserEntrypoint: "",
        workerEntrypoint: "",
        defaultConfig: {},
    }
    /**
     * The upload time of the mod version.
     * @type {Date}
     */
    uploadTime = new Date()
    /**
     * The number of downloads for the mod version.
     * @type {number}
     */
    downloadCount = 0
}

/**
 * Handles operations using a MongoDB client.
 * @async
 * @function
 * @param {function(MongoClient): Promise<any>} [runClient] - Async function to run with the connected client.
 * @returns {Promise<any>} The result of the operation.
 */
async function HandleClient(runClient = async function (client = new MongoClient(mongoUri)) {
}) {
    var client = new MongoClient(mongoUri);
    try {
        await client.connect();
        var result = await runClient(client);
        return result;
    } catch (err) {
        log.log(`${err}`);
    } finally {
        await client.close();
    }
}

/**
 * all global db functions
 * @module DB
 */

module.exports = {
    /**
     * Functions related to mods.
     * @namespace GetMod
     * @memberof module:DB
     */

    GetMod: {
        /**
         * Functions related to Mod versions.
         * @namespace Versions
         * @memberof module:DB.GetMod
         */
        Versions:{
            /**
             * Retrieves all versions of a mod.
             * @async
             * @function
             * @memberof module:DB.GetMod.Versions
             * @param {string} [modID] - The ID of the mod.
             * @param {object} [project] - filter out data
             * @param {object} [sort] - how to sort the data
             * @returns {Promise<modVersionEntry[]>} An array of all versions of the mod.
             */
            All:async function (modID = "",project= {},sort = {uploadTime: 1}) {
                var endresult = await HandleClient(async (client) => {
                    var db = await client.db('SandustryMods');
                    var modVersionsCollection = await db.collection('ModVersions');
                    var restult = await modVersionsCollection.find(
                        {modID: modID}
                    ).sort(sort).project(project);
                    return restult.toArray();
                })
                return endresult;
            },
            /**
             * Retrieves the data of a specific mod version.
             * @async
             * @function
             * @memberof module:DB.GetMod.Versions
             * @param {string} [modID] - The ID of the mod.
             * @param {string} [version] - The version of the mod to retrieve.
             * @param {object} [project] - filter out data
             * @param {object} [sort] - how to sort the data
             * @returns {Promise<modVersionEntry>} The mod version data, or `null` if not found.
             */
            One: async function (modID = "", version = "",project = {},sort = {uploadTime: 1}) {
                var endresult = await HandleClient(async (client) => {
                    var db = await client.db('SandustryMods');
                    var modVersionsCollection = await db.collection('ModVersions');
                    var restult = {}
                    if(version==""){
                        restult = await modVersionsCollection.find(
                            {modID: modID}
                        ).sort(sort).project(project).limit(1);
                    }else{
                        restult = await modVersionsCollection.find(
                            {modID: modID, "modinfo.version": version}
                        ).sort(sort).project(project).limit(1);
                    }
                    var returnresult = await await restult.toArray()[0];
                    return returnresult
                })
                return endresult;
            },
            /**
             * Retrieves a list of version numbers for a specific `modID`.
             * @async
             * @function
             * @memberof module:DB.GetMod.Versions
             * @param {string} modID - The ID of the mod.
             * @returns {Promise<string[]>} A list of version numbers, or an empty array if not found.
             */
            Numbers: async function (modID = "") {
                var sort = {uploadTime: 1}
                var endresult = await HandleClient(async (client) => {
                    var db = await client.db('SandustryMods');
                    var modVersionsCollection = await db.collection('ModVersions');
                    var restult = await modVersionsCollection.find(
                        {modID: modID},
                        { projection: { 'modData.version': 1, _id: 0 } }
                    ).sort(sort);
                    return restult.toArray();
                })
                return endresult.map(entry => entry.modData.version || "Unknown");
            }
        },
        /**
         * Functions related to Mod Data.
         * @namespace Data
         * @memberof module:DB.GetMod
         */
        Data:{
            /**
             * Searches the mod db using the query provided
             * @async
             * @function
             * @memberof module:DB.GetMod.Data
             * @param {string} [query] - The search query
             * @param {boolean} [verifiedOnly] - if it should only find verified mods
             * @param {boolean} [IdsOnly] - if it should return modids only
             * @param {object} [page ={number:1,size:200}] - what page of search is this and what size
             * @param {object} [project] - filter out data
             * @param {object} [sort] - how to sort the data
             * @returns {(Promise<modEntry[]>|string[])} An array of found mods or modid if IdsOnly
             */
            Search: async function (query = "",verifiedOnly = true, IdsOnly = true,page = {number:1,size:200},project = {},sort = {}) {
                var endresult = await HandleClient(async (client) => {
                    var db = client.db('SandustryMods');
                    var modsCollection = db.collection('Mods');
                    var projection = {};
                    if (IdsOnly === true) {
                        projection = { "modData.modID": 1, _id: 0 };
                    }
                    if (project) {
                        projection = { ...projection, ...project };
                    }

                    var searchResults = await modsCollection.find({
                        $and: [
                            {
                                $or: [
                                    { "modData.modID": { $regex: query, $options: 'i' } },
                                    { "modData.name": { $regex: query, $options: 'i' } },
                                    { "modData.version": { $regex: query, $options: 'i' } },
                                    { "modData.author": { $regex: query, $options: 'i' } },
                                    { "modData.shortDescription": { $regex: query, $options: 'i' } },
                                    { "modData.modloaderVersion": { $regex: query, $options: 'i' } },
                                    { "modData.tags": { $regex: query, $options: 'i' } },
                                    { "modData.electronEntrypoint": { $regex: query, $options: 'i' } },
                                    { "modData.browserEntrypoint": { $regex: query, $options: 'i' } },
                                    { "modData.workerEntrypoint": { $regex: query, $options: 'i' } },
                                ]
                            },
                            ...(verifiedOnly === true ? [{ verified: true }] : [])
                        ]
                    })
                        .project(projection).sort(sort);

                    searchResults = searchResults
                        .skip((page.number - 1) * page.size)
                        .limit(page.size);
                    searchResults = await searchResults.toArray();

                    if (IdsOnly === true) {
                        searchResults = searchResults.map(entry => entry.modData.modID);
                    }

                    return searchResults;
                })
                return endresult;
            },
            /**
             * Retrieves the data of a specific mod.
             * @async
             * @function
             * @memberof module:DB.GetMod.Data
             * @param {string} [modID] - The ID of the mod.
             * @param {object} [project] - filter out data
             * @param {object} [sort] - how to sort the data
             * @returns {Promise<modVersionEntry>} The mod version data, or `null` if not found.
             */
            One: async function (modID = "",project = {},sort = {}) {
                var endresult = await HandleClient(async (client) => {
                    var db = client.db('SandustryMods');
                    var modsCollection = db.collection('Mods');
                    var restult = await modsCollection.find(
                        {modID: modID}
                    ).sort(sort).project(project).limit(1);
                    var returnresult = await await restult.toArray()[0];
                    return returnresult
                })
                return endresult;
            },
            /**
             * Uploads a mod to the db and automatically adds versions to existing mods if a mod entry exists
             * @async
             * @function
             * @memberof module:DB.GetMod.Data
             * @param {object} [payload]
             * @param {boolean} [discordBypass]
             * @returns {Promise<void>}
             */
            Upload: async function (payload = { filename:"", filedata:"", discordInfo:{id:"",tokenResponse:{access_token:""}} },discordBypass = false) {
                var endresult = await HandleClient(async (client) => {
                    var db = client.db('SandustryMods');
                    var modsCollection = db.collection("Mods");
                    var versionsCollection = db.collection("ModVersions");
                    var modID = crypto.randomUUID();
                    var { filename, filedata, discordInfo } = payload;
                    if (!filename || !filedata) {
                        return 'Invalid payload';
                    }
                    if (!discordInfo || !discordInfo.id || !discordInfo.tokenResponse || !discordInfo.tokenResponse.access_token) {
                        return 'Invalid discordInfo';
                    }
                    if(!discordBypass){
                        var isValidUser = await verifyDiscordUser(discordInfo.id, discordInfo.tokenResponse.access_token);
                        if (!isValidUser) {
                            return "Discord user validation failed";
                        }
                    }

                    var zipBuffer = Buffer.from(filedata, "base64");
                    var compressedZipBuffer = await compress(zipBuffer, 10);

                    var content = await JSZip.loadAsync(zipBuffer);
                    var fileNames = Object.keys(content.files);

                    var readmePath = fileNames.find((path) => path.endsWith("README.md"));
                    var description = "";
                    if (readmePath) {
                        var readmeFile = await content.file(readmePath);
                        description = await readmeFile.async("text");
                    }

                    var modInfoPath = fileNames.find((path) => path.endsWith("modinfo.json"));
                    var modInfoFile = await content.file(modInfoPath);
                    var modInfoContent = await modInfoFile.async("text");
                    var modInfo = await JSON.parse(modInfoContent);
                    Object.keys(modInfo).forEach((key) => {
                        if (typeof modInfo[key] === "string") {
                            modInfo[key] = sanitizeHtml(modInfo[key]);
                        }
                    });

                    var modData = {
                        ...modInfo,
                        description: description,
                    };
                    var modEntry = {};
                    modEntry = await modsCollection.findOne({ modID: modID, "Author.discordID": discordInfo.id });
                    if (!modEntry) {
                        modEntry = await modsCollection.findOne({ "modData.name": modData.name, "Author.discordID": discordInfo.id });
                    }
                    modID = modEntry ? modEntry.modID : modID;
                    if (!modEntry) {
                        modEntry = {
                            modID: modID,
                            modData: modData,
                            Author: {
                                discordID: discordInfo.id,
                                discordUsername: discordInfo.username,
                            },
                            votes: 0,
                            verified:false,
                        };
                        await modsCollection.insertOne(modEntry);
                    }else{
                        modEntry.modData = modData;
                        await modsCollection.replaceOne({ modID: modID }, modEntry);
                    }
                    var modVersionEntry = {
                        modID: modEntry.modID,
                        modfile: compressedZipBuffer.toString("base64"),
                        modData: modData,
                        uploadTime: new Date(),
                        downloadCount: 0,
                    };
                    await versionsCollection.insertOne(modVersionEntry);
                    return modID;
                })
                return endresult;
            }
        }
    }
}

function verifyDiscordUser(userId, accessToken) {
    return new Promise((resolve, reject) => {
        var options = {
            hostname: "discord.com",
            path: "/api/users/@me",
            method: "GET",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        };

        var req = https.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk.toString();
            });

            res.on("end", () => {
                try {
                    var userResponse = JSON.parse(data);

                    // Check if the user ID matches the ID from the token response
                    if (res.statusCode === 200 && userResponse.id === userId) {
                        resolve(true);
                    } else {
                        console.warn("User ID mismatch or token is invalid:", userResponse);
                        resolve(false);
                    }
                } catch (err) {
                    console.error("Error parsing user verification response:", err);
                    resolve(false);
                }
            });
        });

        req.on("error", (err) => {
            console.error("Error verifying Discord user:", err);
            resolve(false);
        });

        req.end();
    });
}
