var ejs = require("ejs");

module.exports = {
	paths: ["/admin"],

	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.templates["base.ejs"], { data: [globalThis.templates["basicheaders.html"], globalThis.templates["admin.html"]] }));
	},
};
