module.exports = {
	paths: ["/api"],

	run: function (req, res) {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end("<h1>API base endpoint /api</h1>");
	},
};
