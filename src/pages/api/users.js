const Utils = require("../../common/utils.js");
const DB = require("../../common/db");
const { verifyDiscordUser } = require("../../common/verifydiscorduser");

const logger = new Utils.Log("pages.users");

module.exports = {
	paths: ["/api/users"],
	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: async function (req, res) {
		// Only allow POST requests with proper authentication
		if (req.method !== "POST") {
			res.writeHead(405, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Method not allowed" }));
		}

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

				// Handle different actions
				if (data.action === "usersDetails") {
					const userID = data.userID;
					const user = await DB.users.one(userID);
					if (!user) {
						res.writeHead(404, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "User not found" }));
						return;
					}

					// Get user's mods
					const mods = await DB.mods.data.search(JSON.stringify({ "Author.discordID": userID }), null, false);

					// Get user's mod versions
					let modVersions = [];
					for (const mod of mods) {
						const versions = await DB.mods.versions.all(mod.modID);
						modVersions = modVersions.concat(
							versions.map((v) => ({
								modID: mod.modID,
								modName: mod.modData.name,
								version: v,
								uploadTime: mod.modData.uploadTime,
							})),
						);
					}

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Viewed user details for ${user.discordUsername} (${userID})`,
						time: new Date(),
						logged: false,
					};
					await DB.actions.add(actionEntry);

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
						}),
					);
				} else if (data.action === "searchUsers") {
					const search = data.search || "";

					// Search for users
					let users = await DB.users.search(search);

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Searched for users with query: ${search}`,
						time: new Date(),
						logged: false,
					};
					await DB.actions.add(actionEntry);

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ users: users }));
				} else if (data.action === "listUsers") {
					// Get all users (limited to 50)
					const users = await DB.users.List();

					// Log the action
					var actionEntry = {
						discordID: discordUserData.id,
						action: `Listed all users`,
						time: new Date(),
						logged: false,
					};
					await DB.actions.add(actionEntry);

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ users: users }));
				} else {
					res.writeHead(400, { "Content-Type": "application/json" });
					res.end(JSON.stringify({ error: "Invalid action" }));
				}
			} catch (error) {
				logger.info(`Error ${error}`);
				res.writeHead(500, { "Content-Type": "application/json" });
				res.end(JSON.stringify({ error: "Server error" }));
			}
		});
	},
};
