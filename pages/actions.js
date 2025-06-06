/**
 * @file actions.js
 * @description Handles action-related API endpoints
 */

var colors = require("colors");
var Utils = require("./../utils");
var Mongo = require("./../Shared/DB");

const log = new Utils.log.log("Sandustry.web.pages.actions", "./sandustry.web.main.txt", true);

/**
 * @namespace actions
 * @memberof module:api
 */

module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:api.actions
	 */
	paths: ["/api/actions"],
	/**
	 * Handles HTTP requests for action data.
	 *
	 * @function run
	 * @memberof api.actions
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

					// Get pagination parameters
					const page = parseInt(data.page) || 1;
					const size = parseInt(data.size) || 50;
					const discordID = data.discordID || "";

					// Build query
					let query = {};
					if (discordID) {
						query.discordID = discordID;
					}

					// Get actions with pagination
					const actions = await Mongo.GetAction.Get(query, { number: page, size: size });

					// Get total count for pagination
					const totalCount = await Mongo.GetAction.Count(query);

					// Log the action
					var actionEntry = {
						discordID: DiscordUserData.id,
						action: `Viewed site actions`,
						time: new Date(),
						logged: false,
					};
					await Mongo.GetAction.Add(actionEntry);

					// Return actions with pagination info
					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							actions: actions,
							pagination: {
								page: page,
								size: size,
								totalCount: totalCount,
								totalPages: Math.ceil(totalCount / size),
							},
						})
					);
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
