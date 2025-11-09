const ejs = require("ejs");
const { includeFromMemory } = require("../../common/ejsExtensions.js");

module.exports = {
	paths: ["", "/", "/home"],

	run: function (req, res) {
		const tpl = globalThis.templates["home.ejs"];
		const html = ejs.render(tpl.content, { include: includeFromMemory }, { filename: tpl.path });
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},
};
