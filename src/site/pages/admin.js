const ejs = require("ejs");
const DB = require("../../common/db");
const { includeFromMemory } = require("../../common/ejsExtensions");
const { getSessionFromRequest } = require("../../common/session");

module.exports = {
	paths: ["/admin"],

	run: async function (req, res) {
		let hasAdminPermissions = false;
		const session = await getSessionFromRequest(req);
		const user = session != null ? await DB.users.one(session.discordID) : null;
		if (user) hasAdminPermissions = user.permissions.includes("admin");

		const tpl = globalThis.templates["admin.ejs"];
		const html = ejs.render(tpl.content, { include: includeFromMemory, hasAdminPermissions, user }, { filename: tpl.path });
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},
};
