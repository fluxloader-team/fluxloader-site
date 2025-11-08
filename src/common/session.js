const DB = require("./db");

async function getUserFromRequest(req) {
	const cookie = (req.headers.cookie || "")
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith("session="));

	if (!cookie) return null;

	const token = cookie.split("=")[1];
	const session = await DB.sessions.one(token);
	if (!session || session.expires < Date.now()) return null;

	const user = await DB.users.one(session.discordID);
	return user;
}

module.exports = { getUserFromRequest };

