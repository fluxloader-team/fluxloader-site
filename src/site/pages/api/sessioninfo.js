const { getUserFromRequest } = require("../../../common/session");

module.exports = {
	paths: ["/api/sessioninfo"],

	run: async (req, res) => {
		const user = await getUserFromRequest(req);
		if (!user) {
			res.writeHead(401, { "Content-Type": "application/json" });
			return res.end(JSON.stringify({ authenticated: false }));
		}

		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				authenticated: true,
				id: user.discordID,
				username: user.discordUsername,
				avatar: user.avatar,
				permissions: user.permissions,
			}),
		);
	},
};
