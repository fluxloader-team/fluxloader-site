module.exports = {
	paths: ["/upload"],

	run: function (req, res) {
		res.writeHead(200, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.templates["template.ejs"], { data: ["", globalThis.templates["upload.html"]] }));
	},
};
