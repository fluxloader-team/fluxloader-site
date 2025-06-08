/**
 * @file users.js
 * @description Handles user-related API endpoints
 */

var Utils = require("./../utils");
var Mongo = require("./../shared/db");
var { verifyDiscordUser } = require("./../shared/verifydiscorduser");

const log = new Utils.Log("sandustry.web.pages.users", "./sandustry.web.main.txt", true);

/**
 * @namespace users
 * @memberof module:api
 */
module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:api.users
	 */
	paths: ["/api/users"],

	/**
	 * Handles HTTP requests for user data.
	 *
	 * @function run
	 * @memberof api.users
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends the response.
	 */
	run: async function (req, res) {
		// Only allow POST requests with proper authentication
		if (req.method !== "POST") {
			res.writeHead(405, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Method not allowed" }));
		}

		var body = "";
		req.on("data", (chunk) => (body += chunk.toString()));

		req.on("end", async () => {
			try {
				var data = JSON.parse(body);
				var discordUserData = data.discordUser;

				// Verify the user is authenticated and has admin permissions
				var UserData = await Mongo.GetUser.One(discordUserData.id);
				if (!UserData) {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "User not found" }));
					return;
				}

				var isValidUser = await verifyDiscordUser(discordUserData.id, discordUserData.tokenResponse.access_token);
				if (!isValidUser) {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Invalid discord user" }));
					return;
				}

				if (!UserData.permissions.includes("admin")) {
					res.writeHead(403, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "User does not have admin permissions" }));
					return;
				}

				// Handle different actions
				if (data.action === "GetUserDetails") {
					const userID = data.userID;
					const user = await Mongo.GetUser.One(userID);
					if (!user) {
						res.writeHead(404, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "User not found" }));
						return;
					}

					// Get user's mods
					const mods = await Mongo.GetMod.Data.Search(JSON.stringify({ "Author.discordID": userID }), null, false);

					// Get user's mod versions
					let modVersions = [];
					for (const mod of mods) {
						const versions = await Mongo.GetMod.Versions.All(mod.modID);
						modVersions = modVersions.concat(
							versions.map((v) => ({
								modID: mod.modID,
								modName: mod.modData.name,
								version: v,
								uploadTime: mod.modData.uploadTime,
							}))
						);
					}

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Viewed user details for ${user.discordUsername} (${userID})`,
						time: new Date(),
						logged: false,
					};
					await Mongo.GetAction.Add(actionEntry);

					// Return user data with stats
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							user: user,
							stats: {
								modsUploaded: mods.length,
								modVersionsUploaded: modVersions.length,
								modVersions: modVersions,
							},
						})
					);
				} else if (data.action === "searchUsers") {
					const search = data.search || "";

					// Search for users
					let users = await Mongo.GetUser.Search(search);

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Searched for users with query: ${search}`,
						time: new Date(),
						logged: false,
					};
					await Mongo.GetAction.Add(actionEntry);

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ users: users }));
				} else if (data.action === "listUsers") {
					// Get all users (limited to 50)
					const users = await Mongo.GetUser.List();

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Listed all users`,
						time: new Date(),
						logged: false,
					};
					await Mongo.GetAction.Add(actionEntry);

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ users: users }));
				} else {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Invalid action" }));
				}
			} catch (error) {
				log.info(`Error ${error}`);
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Server error" }));
			}
		});
	},
};
