const ejs = require("ejs");
const DB = require("../../common/db");
const { includeFromMemory } = require("../../common/ejsExtensions");
const { getSessionFromRequest } = require("../../common/session");

module.exports = {
	paths: ["/upload"],

	run: function (req, res) {
		const tpl = globalThis.templates["upload.ejs"];
		const html = ejs.render(tpl.content, { include: ejsExtensions.includeFromMemory }, { filename: tpl.path });

		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},

	run: async function (req, res) {
		const session = await getSessionFromRequest(req);
		const user = session != null ? await DB.users.one(session.discordID) : null;

		const tpl = globalThis.templates["upload.ejs"];
		const html = ejs.render(tpl.content, { include: includeFromMemory, user }, { filename: tpl.path });
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},
};
