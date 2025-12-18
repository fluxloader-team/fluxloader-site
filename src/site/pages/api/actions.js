const Utils = require("../../../common/utils.js");
const DB = require("../../../common/db");
const { getSessionFromRequest } = require("../../../common/session");

const logger = new Utils.Log("pages.actions");

module.exports = {
	paths: ["/api/actions"],

	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: async function (req, res) {
		// Verify the user is authenticated and has admin permissions
		const session = await getSessionFromRequest(req);
		const user = session != null ? await DB.users.one(session.discordID) : null;
		if (!user || !user.permissions.includes("admin")) {
			res.writeHead(403, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Not authenticated" }));
			return;
		}

		// Only allow POST requests with proper authentication
		if (req.method === "POST") {
			let body = "";
			req.on("data", (chunk) => (body += chunk.toString()));
			req.on("end", async () => {
				try {
					var data = JSON.parse(body);

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
						discordID: user.discordID,
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
