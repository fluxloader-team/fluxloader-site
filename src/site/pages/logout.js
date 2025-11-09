const { getSessionFromRequest, removeSession } = require("../../common/session");

module.exports = {
	paths: ["/logout"],
	run: async (req, res) => {
		const session = await getSessionFromRequest(req);
		if (session) await removeSession(session.token);

		// Clear the cookie and redirect to home
		res.writeHead(200, {
			"Content-Type": "application/json",
			"Set-Cookie": "session=; Path=/; Max-Age=0; HttpOnly",
		});
		res.end(JSON.stringify({ ok: true }));
	},
};
