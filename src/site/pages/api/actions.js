const Utils = require("../../../common/utils.js");
const DB = require("../../../common/db");

const logger = new Utils.Log("pages.actions");

module.exports = {
	paths: ["/api/actions"],

	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: async function (req, res) {
		// Only allow POST requests with proper authentication
		if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => (body += chunk.toString()));
			req.on("end", async () => {
				try {
					var data = JSON.parse(body);
					var discordUserData = data.discordUser;

					// Verify the user is authenticated and has admin permissions
					var UserData = await DB.users.one(discordUserData.id);
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
					const actions = await DB.actions.get(query, { number: page, size: size });

					// Get total count for pagination
					const totalCount = await DB.actions.count(query);

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Viewed site actions`,
						time: new Date(),
						logged: false,
					};
					await DB.actions.add(actionEntry);

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
						}),
					);
				} catch (error) {
					logger.info(`Error ${error}`);
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
