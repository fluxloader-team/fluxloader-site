/**
 * @file users.js
 * @description Handles user-related API endpoints
 */

var colors = require("colors");
var Utils = require("./../utils");
var Mongo = require("./../Shared/DB");

const log = new Utils.log.log("Sandustry.web.pages.users", "./sandustry.web.main.txt", true);

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
		if (req.method === "POST") {
			var body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});

			req.on("end", async () => {
				try {
					var data = JSON.parse(body);
					var DiscordUserData = data.discordUser;

					// Verify the user is authenticated and has admin permissions
					var UserData = await Mongo.GetUser.One(DiscordUserData.id);
					if (!UserData) {
						res.writeHead(403, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "User not found" }));
						return;
					}

					var isValidUser = await verifyDiscordUser(DiscordUserData.id, DiscordUserData.tokenResponse.access_token);
					if (!isValidUser) {
						res.writeHead(403, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Invalid Discord user" }));
						return;
					}

					if (!UserData.permissions.includes("admin")) {
						res.writeHead(403, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "User does not have admin permissions" }));
						return;
					}

					// Handle different actions
					if (data.action === "getUserDetails") {
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
							discordID: DiscordUserData.id,
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
							discordID: DiscordUserData.id,
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
							discordID: DiscordUserData.id,
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
		} else {
			res.writeHead(405, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Method not allowed" }));
		}
	},
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
