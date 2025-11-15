module.exports = {
	paths: ["/logout"],
	run: async (req, res) => {
		res.writeHead(302, {
			Location: "/",
			"Set-Cookie": "session=; Path=/; Max-Age=0; HttpOnly",
		});
		res.end();
	},
};
