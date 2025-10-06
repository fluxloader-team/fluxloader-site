var ejs = require("ejs");

module.exports = {
	paths: ["/admin"],

	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(globalThis.components["admin.html"]);
	},
};
