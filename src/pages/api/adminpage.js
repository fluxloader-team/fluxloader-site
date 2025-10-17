const Utils = require("../../common/utils.js");
const DB = require("../../common/db");
const { verifyDiscordUser } = require("../../common/verifydiscorduser");

const logger = new Utils.Log("pages.admin");

module.exports = {
	paths: ["/api/admin/page"],

	run: function (req, res) {
		// Check if the method is POST
		logger.info(`Received request for /api/admin/page with method: ${req.method}`);
		if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => body += chunk.toString());
			req.on("end", async () => {
				try {
					res.writeHead(200, { "Content-Type": "application/json" });
					var discordUserData = (await JSON.parse(body)).discordUser;
					var UserData = await DB.users.one(discordUserData.id);
					if (UserData) {
					} else {
						UserData = await DB.users.add({
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
						res.end(JSON.stringify({ run: globalThis.public["admin.js"] }));
					} else {
						res.end(JSON.stringify({ error: "User does not have admin permissions" }));
					}
				} catch (error) {
					logger.info(`Error ${error}`);
					res.end(JSON.stringify({ error: "Invalid JSON format" }));
				}
			});
		} else {
			res.writeHead(405, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Method not allowed" }));
		}
	},
};
