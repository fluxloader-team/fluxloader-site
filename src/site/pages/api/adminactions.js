const Utils = require("../../../common/utils.js");
const DB = require("../../../common/db");
const { getSessionFromRequest } = require("../../../common/session");

const logger = new Utils.Log("pages.adminactions");

module.exports = {
	paths: ["/api/admin/actions"],
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

		// Check if the method is POST
		if (req.method !== "POST") {
			res.writeHead(405, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Method not allowed" }));
		}

		let body = "";
		req.on("data", (chunk) => (body += chunk.toString()));
		req.on("end", async () => {
			try {
				res.writeHead(200, { "Content-Type": "application/json" });
				var data = await JSON.parse(body);
				var action = data.action;
				var modID = data.modID;
				var authorID = data.authorID;

				// Handle different admin actions
				switch (action) {
					case "verify":
						if (!modID) {
							res.end(JSON.stringify({ error: "Missing modID parameter" }));
							return;
						}

						// Get the mod
						var mod = await DB.mods.data.one(modID);
						if (!mod) {
							res.end(JSON.stringify({ error: "Mod not found" }));
							return;
						}

						// Update the mod's verified status
						mod.verified = true;
						await DB.mods.data.update(modID, mod);

						// Log the action
						var actionEntry = {
							discordID: user.discordID,
							action: `Verified mod ${mod.modData.name} (${modID})`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(actionEntry);

						res.end(JSON.stringify({ success: true, message: "Mod verified successfully" }));
						break;

					case "deny":
						if (!modID) {
							res.end(JSON.stringify({ error: "Missing modID parameter" }));
							return;
						}

						// Get the mod
						var mod = await DB.mods.data.one(modID);
						if (!mod) {
							res.end(JSON.stringify({ error: "Mod not found" }));
							return;
						}

						// Delete the mod and all its versions
						await DB.mods.delete(modID);

						// Log the action
						var actionEntry = {
							discordID: user.discordID,
							action: `Denied and deleted mod ${mod.modData.name} (${modID})`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(actionEntry);

						res.end(JSON.stringify({ success: true, message: "Mod denied and deleted successfully" }));
						break;

					case "banAuthor":
						if (!authorID) {
							res.end(JSON.stringify({ error: "Missing authorID parameter" }));
							return;
						}

						// Ban the user
						await DB.users.ban(authorID);

						// Log the action
						var actionEntry = {
							discordID: user.discordID,
							action: `Banned author with ID ${authorID}`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(actionEntry);

						res.end(JSON.stringify({ success: true, message: "Author banned successfully" }));
						break;

					case "unbanUser":
						if (!authorID) {
							res.end(JSON.stringify({ error: "Missing authorID parameter" }));
							return;
						}

						// Unban the user
						var user = await DB.users.one(authorID);
						if (!user) {
							res.end(JSON.stringify({ error: "User not found" }));
							return;
						}

						// Update user's banned status
						await DB.users.unban(authorID);

						// Log the action
						var actionEntry = {
							discordID: user.discordID,
							action: `Unbanned user with ID ${authorID}`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(actionEntry);

						res.end(JSON.stringify({ success: true, message: "User unbanned successfully" }));
						break;

					case "setAdmin":
						if (!authorID) {
							res.end(JSON.stringify({ error: "Missing authorID parameter" }));
							return;
						}

						// Get the user
						var user = await DB.users.one(authorID);
						if (!user) {
							res.end(JSON.stringify({ error: "User not found" }));
							return;
						}

						// Update user's permissions
						if (!user.permissions.includes("admin")) {
							await DB.users.updatePermissions(authorID, "admin", true);
						}

						// Log the action
						var actionEntry = {
							discordID: user.discordID,
							action: `Set admin status for user with ID ${authorID}`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(actionEntry);

						res.end(JSON.stringify({ success: true, message: "User set as admin successfully" }));
						break;

					case "removeAdmin":
						if (!authorID) {
							res.end(JSON.stringify({ error: "Missing authorID parameter" }));
							return;
						}

						// Get the user
						var user = await DB.users.one(authorID);
						if (!user) {
							res.end(JSON.stringify({ error: "User not found" }));
							return;
						}

						// Update user's permissions
						if (user.permissions.includes("admin")) {
							await DB.users.updatePermissions(authorID, "admin", false);
						}

						// Log the action
						var actionEntry = {
							discordID: user.discordID,
							action: `Removed admin status for user with ID ${authorID}`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(actionEntry);

						res.end(JSON.stringify({ success: true, message: "Admin status removed successfully" }));
						break;

					default:
						res.end(JSON.stringify({ error: "Invalid action" }));
				}
			} catch (error) {
				logger.info(`Error ${error}`);
				res.end(JSON.stringify({ error: "Invalid JSON format or server error" }));
			}
		});
	},
};
