const ejs = require("ejs");
const { getUserFromRequest, userHasPermission } = require("../../common/session");
const ejsExtensions = require("../../common/ejsExtensions");

module.exports = {
	paths: ["/admin"],

	run: async function (req, res) {
		const user = await getUserFromRequest(req);
		if (!user) {
			res.writeHead(302, { Location: "/auth/discord" });
			return res.end();
		}

		const hasAdminPermissions = !userHasPermission(user, "admin");
		const tpl = globalThis.templates["admin.ejs"];
		const html = ejs.render(tpl.content, { include: ejsExtensions.includeFromMemory, hasAdminPermissions }, { filename: tpl.path });

		console.log(html);

		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},
};
