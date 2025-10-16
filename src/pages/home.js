module.exports = {
	paths: ["", "/", "/home"],

	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(globalThis.public["home.html"]);
	},
};
