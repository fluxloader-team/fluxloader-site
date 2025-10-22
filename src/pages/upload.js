module.exports = {
	paths: ["/upload"],

	run: function (req, res) {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(globalThis.public["upload.html"]);
	},
};
