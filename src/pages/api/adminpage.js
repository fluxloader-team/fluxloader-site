/**
 * @file adminpage.js
 * @description Returns the final admin page if permitted
 */

var Utils = require("../../utils");
const https = require("https");
var Mongo = require("../../shared/db");
var { verifyDiscordUser } = require("../../shared/verifydiscorduser");

var log = new Utils.Log("sandustry.web.pages.admin", "./sandustry.web.main.txt", true);

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
					var discordUserData = (await JSON.parse(body)).discordUser;
					var UserData = await Mongo.GetUser.One(discordUserData.id);
					if (UserData) {
					} else {
						UserData = await Mongo.GetUser.Add({
							discordID: discordUserData.id,
							discordUsername: discordUserData.username,
							permissions: ["user"],
							description: "new User",
							joinedAt: new Date(),
							banned: false,
						});
					}
					var isValidUser = await verifyDiscordUser(discordUserData.id, discordUserData.tokenResponse.access_token);
					if (!isValidUser) {
						res.end(JSON.stringify({ error: "Invalid discord user" }));
						return;
					}
					if (UserData.permissions.includes("admin")) {
						res.end(JSON.stringify({ data: globalThis.templates["adminpage.html"], run: globalThis.templates["adminpage.js"] }));
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
