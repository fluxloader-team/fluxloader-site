module.exports = {
	paths: ["/api"],

	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: function (req, res) {
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(JSON.stringify({ message: "API alive" }));
	},
};
