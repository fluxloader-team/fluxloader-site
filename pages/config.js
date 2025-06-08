/**
 * @file config.js
 * @description Handles config-related API endpoints
 */

var Utils = require("./../utils");
var fs = require("fs");
var path = require("path");
var https = require("https");
var { verifyDiscordUser } = require("./../shared/verifydiscorduser");

const log = new Utils.Log("sandustry.web.pages.config", "./sandustry.web.main.txt", true);

/**
 * @namespace config
 * @memberof module:api
 */

module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:api.config
	 */
	paths: ["/api/config"],
	/**
	 * Handles HTTP requests for config data.
	 *
	 * @function run
	 * @memberof api.config
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends the response.
	 */
	run: async function (req, res) {
		// Only allow POST requests with proper authentication
		try {
			if (req.method === "POST") {
				// Process the request body
				var body = "";
				req.on("data", (chunk) => {
					body += chunk;
				});

				req.on("end", async () => {
					try {
						var data = JSON.parse(body);
						var discordUserData = data.discordUser;

						// Verify the user is authenticated and has admin permissions
						var Mongo = require("./../shared/db");
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
						if (data.action === "getConfig") {
							// Get config.json content
							const configPath = path.join(__dirname, "..", "config.json");
							const configContent = fs.readFileSync(configPath, "utf8");

							// Log the action
							var actionEntry = {
								discordID: discordUserData.id,
								action: `Viewed config.json`,
								time: new Date(),
								logged: false,
							};
							await Mongo.GetAction.Add(actionEntry);

							res.writeHead(200, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ config: configContent }));
						} else if (data.config) {
							// Update config.json content
							var configContent = data.config;

							// Validate JSON
							try {
								JSON.parse(configContent);
							} catch (e) {
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(JSON.stringify({ error: "Invalid JSON format" }));
								return;
							}

							// Write to config.json
							const configPath = path.join(__dirname, "..", "config.json");
							fs.writeFileSync(configPath, configContent, "utf8");

							// Log the action
							var actionEntry = {
								discordID: discordUserData.id,
								action: `Updated config.json`,
								time: new Date(),
								logged: false,
							};
							await Mongo.GetAction.Add(actionEntry);

							res.writeHead(200, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ success: true }));
						} else {
							res.writeHead(400, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ error: "Invalid request" }));
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
		} catch (error) {
			log.info(`Error ${error}`);
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Server error" }));
		}
	},
};
