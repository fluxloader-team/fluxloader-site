module.exports = {
	paths: ["/logout"],
	run: async (req, res) => {
		res.writeHead(302, {
			"Set-Cookie": "session=; HttpOnly; Path=/; Max-Age=0",
			Location: "/",
		});
		res.end();
	},
};
