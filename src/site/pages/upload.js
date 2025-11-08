const ejs = require("ejs");
const ejsExtensions = require("../../common/ejsExtensions");

module.exports = {
	paths: ["/upload"],

	run: function (req, res) {
		const tpl = globalThis.templates["upload.ejs"];
		const html = ejs.render(tpl.content, { include: ejsExtensions.includeFromMemory }, { filename: tpl.path });

		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(html);
	},
};
