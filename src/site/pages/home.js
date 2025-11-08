const ejs = require("ejs");

module.exports = {
	paths: ["", "/", "/home"],

	run: function (req, res) {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.templates["template.ejs"], { data: ["", globalThis.templates["home.html"]] }));
	},
};
