/**
 * @file adminpage.js
 * @description Returns the final admin page if permitted
 */

var Utils = require("../../common/utils.js");
const https = require("https");
var Mongo = require("../../common/db");
var { verifyDiscordUser } = require("../../common/verifydiscorduser");

var log = new Utils.Log("sandustry.web.pages.admin", "./sandustry.web.main.txt", true);

/**
 * @namespace admin
 * @memberof module:api
 */

module.exports = {
	paths: ["/api/admin/page"],

	run: function (req, res) {
		// Check if the method is POST
		console.log(`Received request for /api/admin/page with method: ${req.method}`);
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
						cosole.log("User has admin permissions, serving admin page.");
						res.end(JSON.stringify({ data: globalThis.components["adminpage.html"], run: globalThis.components["adminpage.js"] }));
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
