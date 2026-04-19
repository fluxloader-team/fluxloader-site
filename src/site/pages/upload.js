const ejs = require("ejs");
const DB = require("../../common/db");
const { customInclude, getTemplateFile } = require("../../common/files.js");
const { getSessionFromRequest } = require("../../common/session");

module.exports = {
	paths: ["/upload"],

	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: async function (req, res) {
		let hasAdminPermissions = false;
		const session = await getSessionFromRequest(req);
		const user = session != null ? await DB.users.one(session.discordID) : null;
		if (user) hasAdminPermissions = user.permissions.includes("admin");

		const tpl = getTemplateFile("upload.ejs");
		const html = ejs.render(tpl.content, { include: customInclude, user, hasAdminPermissions }, { filename: tpl.path });
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},
};
