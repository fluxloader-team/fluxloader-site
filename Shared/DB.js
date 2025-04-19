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
 * Represents a user entry in the database.
 *
 * This class is used to define the structure of user data stored in the `Users` collection.
 *
 * @class
 */
class userEntry {
    /**
     * The Discord ID of the user (unique identifier).
     * @type {string}
     */
    discordID = "";

    /**
     * The Discord username of the user.
     * @type {string}
     */
    discordUsername = "";

    /**
     * An array of permissions assigned to the user.
     * @type {string[]}
     */
    permissions = [""];

    /**
     * A description or bio for the user.
     * @type {string}
     */
    description = "";

    /**
     * The date and time when the user joined. Defaults to the current date and time.
     * @type {Date}
     */
    joinedAt = new Date();
    /**
     * if the user is banned
     * @type {boolean}
     */
    banned = false
}

/**
 * Handles operations using a MongoDB client.
 * @async
 * @function
 * @param {function(MongoClient): Promise<any>} [runClient] - Async function to run with the connected client.
 * @returns {Promise<any>} The result of the operation.
 */
async function HandleClient(runClient = async function (client = new MongoClient(mongoUri)) {}) {
    var client = new MongoClient(mongoUri);
    var result = null
    try {
        await client.connect();
        result = await runClient(client);
        await client.close();
        return result
    } catch (err) {
        log.log(`${err}`);
    } finally {
        //await client.close();
    }
}

/**
 * all global db functions
 * @module DB
 */
/**
 * Functions related to mods.
 * @namespace GetMod
 * @memberof module:DB
 */
var GetMod = {
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
        One: async function (modID = "", version = "",project = {},sort = {uploadTime: -1}) {
            var endresult = await HandleClient(async (client) => {
                var db = client.db('SandustryMods');
                var modVersionsCollection = db.collection('ModVersions');
                var restult = {}
                if(version === ""){
                    restult = modVersionsCollection.find(
                        {'modID': modID}
                    )
                        .sort(sort)
                        .project(project);
                }else{
                    restult = modVersionsCollection.find(
                        {modID: modID, "modData.version": version}
                    )
                        .sort(sort).project(project);
                }
                var returnresult = await restult.toArray();
                return returnresult[0]
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
            var sort = {uploadTime: -1}
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
        },
        /**
         * Deletes a specific version of a mod from the database.
         * If the mod has only one remaining version and that version is deleted, the mod itself is also removed from the `Mods` collection.
         *
         * @async
         * @function Delete
         * @memberof module:DB
         *
         * @param {string} [modID] - The unique identifier for the mod.
         * @param {string} [version] - The specific version of the mod to delete.
         *
         * @returns {Promise<Object>} A promise that resolves to the result of the deletion operation for the specified mod version.
         * - If the mod version was deleted, the result contains confirmation of the deletion.
         * - If the mod had only one version and it is deleted, the mod itself is also removed from the `Mods` collection.
         *
         * @throws {Error} Throws an error if there is an issue connecting to the database or performing the deletion operations.
         *
         * @example
         * // Deleting a specific mod version
         * const result = await Delete("someModID", "1.0.0");
         * console.log("Deletion Status:", result);
         *
         * // If only one version remained and was deleted, the mod will also be removed from the database.
         */
        Delete: async function (modID = "", version = "") {
            var endresult = await HandleClient(async (client) => {
                var db = client.db('SandustryMods');
                var modVersionsCollection = await db.collection('ModVersions');
                var Versions = await modVersionsCollection.find({ modID: modID})
                var restult = await modVersionsCollection.deleteOne({ modID: modID, "modData.version": version });
                if((await Versions.toArray()).length === 1){
                    var modsCollection = db.collection("Mods");
                    await modsCollection.deleteOne({ modID: modID });
                }
                return restult;
            })
            return endresult;
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
                if(!discordBypass){
                    if (!discordInfo || !discordInfo.id || !discordInfo.tokenResponse || !discordInfo.tokenResponse.access_token) {
                        return 'Invalid discordInfo';
                    }
                    var isValidUser = await verifyDiscordUser(discordInfo.id, discordInfo.tokenResponse.access_token);
                    if (!isValidUser) {
                        return "Discord user validation failed";
                    }else{
                        var UserRecord = await GetUser.One(discordInfo.id)
                        if(!UserRecord){
                            var User = new userEntry()
                            User.discordID = discordInfo.id
                            User.discordUsername = discordInfo.username
                            User.permissions = ["user"]
                            User.description = "new user"
                            User.joinedAt = new Date()
                            User.banned = false
                            await GetUser.Add(User)
                        }
                        else{
                            if(UserRecord.banned){
                                return "User is banned"
                            }
                        }
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
                var modEntry = null;
                modEntry = await modsCollection.findOne({ modID: modID, "Author.discordID": discordInfo.id });
                if (modEntry == null) {
                    modEntry = await modsCollection.findOne({ "modData.name": modData.name, "Author.discordID": discordInfo.id });
                }
                modID = modEntry ? modEntry.modID : modID;
                if (modEntry == null) {
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
        },
        Update: async function (modID = "", entry = new modEntry()) {
            var endresult = await HandleClient(async (client) => {
                var db = client.db('SandustryMods');
                var modsCollection = db.collection("Mods");
                var restult = await modsCollection.updateOne({ modID: modID }, { $set: entry });
                return restult;
            })
            return endresult;
        }
    },
    /**
     * Deletes a mod and all its associated versions from the database based on the provided mod ID.
     *
     * This function removes the mod record from the `Mods` collection and all corresponding entries from the `ModVersions` collection.
     *
     * @async
     * @function Delete
     * @memberof module:DB
     *
     * @param {string} [modID] - The unique identifier for the mod to be deleted.
     *
     * @returns {Promise<Object>} A promise that resolves to an object containing the results of the deletion:
     * - `modDB` (Object): The result of the deletion operation for the mod in the `Mods` collection.
     * - `VersionsDB` (Object): The result of the deletion operation for the mod versions in the `ModVersions` collection.
     *
     * @throws {Error} Throws an error if there is an issue connecting to the database or performing the deletion operations.
     *
     * @example
     * // Deleting a mod and its versions
     * const result = await Delete("someModID");
     * console.log("Mod Deletion Status:", result.modDB);
     * console.log("Version Deletion Status:", result.VersionsDB);
     */
    Delete: async function (modID = "") {
        var endresult = await HandleClient(async (client) => {
            var db = client.db('SandustryMods');
            var modsCollection = db.collection("Mods");
            var restult = await modsCollection.deleteOne({ modID: modID });
            var modVersionsCollection = await db.collection('ModVersions');
            var restult2 = await modVersionsCollection.deleteMany({ modID: modID });
            return {modDB: restult, VersionsDB: restult2};
        })
        return endresult;
    }
}
/**
 * Functions related to user management in the database.
 * @namespace GetUser
 * @memberof module:DB
 */
var GetUser = {
    /**
     * Retrieves a single user from the database using their Discord ID.
     *
     * @async
     * @function One
     * @memberof module:DB.GetUser
     *
     * @param {string} [discordID] - The Discord ID of the user to retrieve.
     *
     * @returns {Promise<Object|null>} A promise that resolves to the user object if found, or `null` if no user exists with the given Discord ID.
     *
     * @throws {Error} Throws an error if there is an issue with connecting to the database or retrieving the user data.
     *
     * @example
     * // Retrieve user with a specific Discord ID
     * const user = await GetUser.One("123456789012345678");
     * if (user) {
     *     console.log("User found:", user);
     * } else {
     *     console.log("User not found.");
     * }
     */
    One:async function (discordID = "") {
        var endresult = await HandleClient(async (client) => {
            var db = client.db('SandustryMods');
            var userCollection = db.collection("Users");
            var restult = await userCollection.findOne({ "discordID": discordID });
            return restult;
        })
        return endresult;
    },
    /**
     * Adds a new user to the database or retrieves the existing user if they already exist.
     *
     * If the user with the specified `discordID` already exists, their data is retrieved and returned.
     * If they do not exist, a new user entry is created and added to the database.
     *
     * @async
     * @function Add
     * @memberof module:DB.GetUser
     *
     * @param {userEntry} [userData=new userEntry()] - The user data to add, represented as an instance of `userEntry`.
     *
     * @returns {Promise<Object>} A promise that resolves to the existing or newly created user object from the database.
     *
     * @throws {Error} Throws an error if there is an issue with connecting to the database or inserting the user data.
     *
     * @example
     * // Add a new user or retrieve an existing user
     * const userData = {
     *     discordID: "123456789012345678",
     *     username: "testUser",
     *     roles: ["admin", "moderator"],
     *     joinedAt: Date.now()
     * };
     *
     * const user = await GetUser.Add(userData);
     * console.log("User in database:", user);
     */
    Add:async function (userData = new userEntry()) {
        var endresult = await HandleClient(async (client) => {
            var db = client.db('SandustryMods');
            var userCollection = db.collection("Users");
            var userExists = await userCollection.find({ "discordID": userData.discordID }).limit(1).toArray();
            if (userExists.length > 0) {
                var result = userExists[0];
                return result
            }else{
                var restult = await userCollection.insertOne(userData);
                return restult;
            }
        })
        return endresult;
    }
}
module.exports = {
    GetMod,
    GetUser,
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
