const ejs = require("ejs");
const { getUserFromRequest } = require("../../common/session");

module.exports = {
	paths: ["/admin"],
	run: async function (req, res) {
		const user = await getUserFromRequest(req);
		if (!user) {
			res.writeHead(302, { Location: "/auth/discord" });
			return res.end();
		}

		if (!user.permissions.includes("admin")) {
			res.writeHead(403, { "Content-Type": "text/html" });
			return res.end("<h1>Access denied</h1>");
		}

		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.templates["template.ejs"], { data: ["", globalThis.templates["admin.html"]] }));
	},
};
