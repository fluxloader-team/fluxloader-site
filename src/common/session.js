const DB = require("./db");

/**
 * @summary Function to extract the session out of the http request
 * Function to extract the session token out of the http request. Fetch the session from the database and check if its vaild
 * @param {import("http").IncomingMessage} req
 * @returns {Promise<import("./db").Session | null>} Null if the session doesn't exist or is invaild
 */
async function getSessionFromRequest(req) {
	const cookie = (req.headers.cookie || "")
		.split(";")
		.map((c) => c.trim())
		.find((c) => c.startsWith("session="));

	if (!cookie) return null;

	const token = cookie.split("=")[1];
	const session = await DB.sessions.one(token);

	if (!session) return null;

	if (session.expires < Date.now()) {
		await DB.sessions.remove(token);
		return null;
	}

	return session;
}

/**
 * @param {string} token
 */
async function removeSession(token) {
	await DB.sessions.remove(token);
}

module.exports = { getSessionFromRequest, removeSession };
