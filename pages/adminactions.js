/**
 * @file adminactions.js
 * @description Handles admin actions like verifying mods, denying mods, and banning authors
 */

var colors = require('colors');
var Utils = require('./../utils');
var Mongo = require("./../Shared/DB");
var config = require('./../config.json');

const log = new Utils.log.log("Sandustry.web.pages.adminactions", "./sandustry.web.main.txt", true);

/**
 * Handles operations using a MongoDB client.
 * @async
 * @function
 * @param {function(MongoClient): Promise<any>} [runClient] - Async function to run with the connected client.
 * @returns {Promise<any>} The result of the operation.
 */
async function HandleClient(runClient = async function (client) {}) {
    var client = new (require('mongodb').MongoClient)(config.mongoUri);
    var result = null;
    try {
        await client.connect();
        result = await runClient(client);
        await client.close();
        return result;
    } catch (err) {
        log.info(`${err}`);
    } finally {
        //await client.close();
    }
}

/**
 * @namespace adminactions
 * @memberof module:api
 */

module.exports = {
    /**
     * The paths that use this module.
     * @type {Array<string>}
     * @memberof module:api.adminactions
     */
    paths: ['/api/admin/actions'],
    /**
     * Handles HTTP requests for admin actions.
     *
     * @function run
     * @memberof api.adminactions
     * @param {IncomingMessage} req - The HTTP request object.
     * @param {ServerResponse} res - The HTTP response object.
     *
     * @returns {Promise<void>} Sends the response.
     */
    run: function (req, res) {
        // Check if the method is POST
        if (req.method === 'POST') {
            var body = '';
            req.on('data', chunk => {
                body += chunk;
            });
            req.on('end', async () => {
                try {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    var data = await JSON.parse(body);
                    var DiscordUserData = data.discordUser;
                    var action = data.action;
                    var modID = data.modID;
                    var authorID = data.authorID;

                    // Verify the user is authenticated and has admin permissions
                    var UserData = await Mongo.GetUser.One(DiscordUserData.id);
                    if (!UserData) {
                        res.end(JSON.stringify({ error: 'User not found' }));
                        return;
                    }

                    var isValidUser = await verifyDiscordUser(DiscordUserData.id, DiscordUserData.tokenResponse.access_token);
                    if (!isValidUser) {
                        res.end(JSON.stringify({ error: 'Invalid Discord user' }));
                        return;
                    }

                    if (!UserData.permissions.includes("admin")) {
                        res.end(JSON.stringify({ error: 'User does not have admin permissions' }));
                        return;
                    }

                    // Handle different admin actions
                    switch (action) {
                        case 'verify':
                            if (!modID) {
                                res.end(JSON.stringify({ error: 'Missing modID parameter' }));
                                return;
                            }

                            // Get the mod
                            var mod = await Mongo.GetMod.Data.One(modID);
                            if (!mod) {
                                res.end(JSON.stringify({ error: 'Mod not found' }));
                                return;
                            }

                            // Update the mod's verified status
                            mod.verified = true;
                            await Mongo.GetMod.Data.Update(modID, mod);

                            // Log the action
                            var actionEntry = {
                                discordID: DiscordUserData.id,
                                action: `Verified mod ${mod.modData.name} (${modID})`,
                                time: new Date(),
                                logged: false
                            };
                            await Mongo.GetAction.Add(actionEntry);

                            res.end(JSON.stringify({ success: true, message: 'Mod verified successfully' }));
                            break;

                        case 'deny':
                            if (!modID) {
                                res.end(JSON.stringify({ error: 'Missing modID parameter' }));
                                return;
                            }

                            // Get the mod
                            var mod = await Mongo.GetMod.Data.One(modID);
                            if (!mod) {
                                res.end(JSON.stringify({ error: 'Mod not found' }));
                                return;
                            }

                            // Delete the mod and all its versions
                            await Mongo.GetMod.Delete(modID);

                            // Log the action
                            var actionEntry = {
                                discordID: DiscordUserData.id,
                                action: `Denied and deleted mod ${mod.modData.name} (${modID})`,
                                time: new Date(),
                                logged: false
                            };
                            await Mongo.GetAction.Add(actionEntry);

                            res.end(JSON.stringify({ success: true, message: 'Mod denied and deleted successfully' }));
                            break;

                        case 'banAuthor':
                            if (!authorID) {
                                res.end(JSON.stringify({ error: 'Missing authorID parameter' }));
                                return;
                            }

                            // Ban the user
                            await Mongo.GetUser.Ban(authorID);

                            // Log the action
                            var actionEntry = {
                                discordID: DiscordUserData.id,
                                action: `Banned author with ID ${authorID}`,
                                time: new Date(),
                                logged: false
                            };
                            await Mongo.GetAction.Add(actionEntry);

                            res.end(JSON.stringify({ success: true, message: 'Author banned successfully' }));
                            break;

                        case 'unbanUser':
                            if (!authorID) {
                                res.end(JSON.stringify({ error: 'Missing authorID parameter' }));
                                return;
                            }

                            // Unban the user
                            var user = await Mongo.GetUser.One(authorID);
                            if (!user) {
                                res.end(JSON.stringify({ error: 'User not found' }));
                                return;
                            }

                            // Update user's banned status
                            await HandleClient(async (client) => {
                                var db = client.db('SandustryMods');
                                var userCollection = db.collection("Users");
                                await userCollection.updateOne({ "discordID": authorID }, { $set: { banned: false } });
                            });

                            // Log the action
                            var actionEntry = {
                                discordID: DiscordUserData.id,
                                action: `Unbanned user with ID ${authorID}`,
                                time: new Date(),
                                logged: false
                            };
                            await Mongo.GetAction.Add(actionEntry);

                            res.end(JSON.stringify({ success: true, message: 'User unbanned successfully' }));
                            break;

                        case 'setAdmin':
                            if (!authorID) {
                                res.end(JSON.stringify({ error: 'Missing authorID parameter' }));
                                return;
                            }

                            // Get the user
                            var user = await Mongo.GetUser.One(authorID);
                            if (!user) {
                                res.end(JSON.stringify({ error: 'User not found' }));
                                return;
                            }

                            // Update user's permissions
                            if (!user.permissions.includes("admin")) {
                                await HandleClient(async (client) => {
                                    var db = client.db('SandustryMods');
                                    var userCollection = db.collection("Users");
                                    await userCollection.updateOne(
                                        { "discordID": authorID }, 
                                        { $push: { permissions: "admin" } }
                                    );
                                });
                            }

                            // Log the action
                            var actionEntry = {
                                discordID: DiscordUserData.id,
                                action: `Set admin status for user with ID ${authorID}`,
                                time: new Date(),
                                logged: false
                            };
                            await Mongo.GetAction.Add(actionEntry);

                            res.end(JSON.stringify({ success: true, message: 'User set as admin successfully' }));
                            break;

                        case 'removeAdmin':
                            if (!authorID) {
                                res.end(JSON.stringify({ error: 'Missing authorID parameter' }));
                                return;
                            }

                            // Get the user
                            var user = await Mongo.GetUser.One(authorID);
                            if (!user) {
                                res.end(JSON.stringify({ error: 'User not found' }));
                                return;
                            }

                            // Update user's permissions
                            if (user.permissions.includes("admin")) {
                                await HandleClient(async (client) => {
                                    var db = client.db('SandustryMods');
                                    var userCollection = db.collection("Users");
                                    await userCollection.updateOne(
                                        { "discordID": authorID }, 
                                        { $pull: { permissions: "admin" } }
                                    );
                                });
                            }

                            // Log the action
                            var actionEntry = {
                                discordID: DiscordUserData.id,
                                action: `Removed admin status for user with ID ${authorID}`,
                                time: new Date(),
                                logged: false
                            };
                            await Mongo.GetAction.Add(actionEntry);

                            res.end(JSON.stringify({ success: true, message: 'Admin status removed successfully' }));
                            break;

                        default:
                            res.end(JSON.stringify({ error: 'Invalid action' }));
                    }
                } catch (error) {
                    log.info(`Error ${error}`);
                    res.end(JSON.stringify({ error: 'Invalid JSON format or server error' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method not allowed' }));
        }
    }
};

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

        var req = require("https").request(options, (res) => {
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
