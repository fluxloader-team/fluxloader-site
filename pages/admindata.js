/**
 * @file admin.js
 * @description Loads the admin api
 */

var Utils = require("./../utils");
const https = require("https");
var Mongo = require("./../Shared/DB");

var log = new Utils.log.log("Sandustry.web.pages.admin", "./sandustry.web.main.txt", true);

/**
 * @namespace admin
 * @memberof module:api
 */

module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:api.admin
	 */
	paths: ["/api/admin/page"],
	/**
	 * Handles HTTP requests for the admin api.
	 *
	 * @function run
	 * @memberof web.admin
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends the error response.
	 */
	run: function (req, res) {
		// Check if the method is POST
		if (req.method === "POST") {
			var body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", async () => {
				try {
					res.writeHead(200, { "Content-Type": "application/json" });
					var DiscordUserData = (await JSON.parse(body)).discordUser;
					var UserData = await Mongo.GetUser.One(DiscordUserData.id);
					if (UserData) {
					} else {
						UserData = await Mongo.GetUser.Add({
							discordID: DiscordUserData.id,
							discordUsername: DiscordUserData.username,
							permissions: ["user"],
							description: "new User",
							joinedAt: new Date(),
							banned: false,
						});
					}
					var isValidUser = await verifyDiscordUser(DiscordUserData.id, DiscordUserData.tokenResponse.access_token);
					if (!isValidUser) {
						res.end(JSON.stringify({ error: "Invalid Discord user" }));
						return;
					}
					if (UserData.permissions.includes("admin")) {
						res.end(JSON.stringify({ data: globalThis.Templates["adminpage.html"], run: globalThis.Templates["admin.js"] }));
						return;
					} else {
						res.end(JSON.stringify({ error: "User does not have admin permissions" }));
					}
				} catch (error) {
					log.info(`Error ${error}`);
					res.end(JSON.stringify({ error: "Invalid JSON format" }));
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
