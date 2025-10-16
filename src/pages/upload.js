const ejs = require("ejs");

module.exports = {
	paths: ["/upload"],

	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(globalThis.public["upload.html"]);
	}
};
