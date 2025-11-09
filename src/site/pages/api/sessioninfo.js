const { getSessionFromRequest } = require("../../../common/session");
const DB = require("../../../common/db");

module.exports = {
	paths: ["/api/sessioninfo"],

	run: async (req, res) => {
		const session = await getSessionFromRequest(req);
		if (!session) {
			res.writeHead(200, { "Content-Type": "application/json" });
			return res.end(JSON.stringify({ authenticated: false }));
		}

		const user = await DB.users.one(session.discordID);
		if (!user) {
			res.writeHead(200, { "Content-Type": "application/json" });
			return res.end(JSON.stringify({ authenticated: false }));
		}

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				authenticated: true,
				token: session.token,
				expires: session.expires,
				user: {
					id: user.discordID,
					username: user.discordUsername,
					avatar: user.avatar,
				},
			})
		);
	},
};
