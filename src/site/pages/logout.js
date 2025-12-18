const { getSessionFromRequest, removeSession } = require("../../common/session");

module.exports = {
	paths: ["/logout"],
	run: async (req, res) => {
		const session = await getSessionFromRequest(req)

		// Deleting the session from the DB
		if (session != null) {
			await removeSession(session.token)
		}

		res.writeHead(302, {
			Location: "/",
			"Set-Cookie": "session=; Path=/; Max-Age=0; HttpOnly",
		});
		res.end();
	},
};
