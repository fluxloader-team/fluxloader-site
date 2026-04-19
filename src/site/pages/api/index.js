module.exports = {
	paths: ["/api"],

	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: function (req, res) {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end("<h1>API base endpoint /api</h1>");
	},
};
