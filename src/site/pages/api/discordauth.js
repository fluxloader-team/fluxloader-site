const querystring = require("querystring");
const Utils = require("../../../common/utils.js");
const DB = require("../../../common/db");
const crypto = require("crypto");

const logger = new Utils.Log("pages.discord");

module.exports = {
	paths: ["/auth/discord", "/auth/discord/callback"],

	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: async function (req, res) {
		var urlSplit = req.url.split("?");
		var pathname = urlSplit[0];
		var queryParams = querystring.parse(urlSplit[1] || "");

		// The user has requested discord auth from the frontend
		if (pathname === "/auth/discord") {
			// Redirect the user to the discord authorization URL with the redirect URI set to our callback endpoint
			// Setting prompt to none means that if a user has already authed with our app they won't be asked again to authorise, unless we have modified what we are requesting such as a new scope
			var authURL = `https://discord.com/oauth2/authorize?client_id=${globalThis.config.discord.clientId}&redirect_uri=${encodeURIComponent(globalThis.config.discord.redirectUri)}&response_type=code&scope=identify&prompt=none`;
			logger.info("Redirecting to discord Authorization URL...");
			res.writeHead(302, { Location: authURL });
			return res.end();
		}

		// The user has been redirected back from discord to our callback endpoint
		if (pathname === "/auth/discord/callback") {
			try {
				// Discord will provide a code we can exchange for an access token
				var code = queryParams.code;
				if (!code) {
					res.writeHead(400, { "Content-Type": "text/html" });
					return res.end('<h1>Error: Missing "code" parameter in the callback URL.</h1>');
				}

				// Now go back to discord and exchange the code for an access token
				var tokenData = querystring.stringify({
					client_id: globalThis.config.discord.clientId,
					client_secret: globalThis.config.discord.clientSecret,
					grant_type: "authorization_code",
					code: code,
					redirect_uri: globalThis.config.discord.redirectUri,
				});
				var tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: tokenData,
				});
				var tokenResponseJson = await tokenResponse.json();
				if (!tokenResponseJson.access_token) {
					res.writeHead(500, { "Content-Type": "text/html" });
					return res.end("<h1>Error: Failed to retrieve access token from discord.</h1>");
				}

				// With the access token, we can now fetch the user's discord information
				// https://discord.com/developers/docs/resources/user#get-current-user
				const userResponse = await (
					await fetch("https://discord.com/api/users/@me", {
						method: "GET",
						headers: { Authorization: `Bearer ${tokenResponseJson.access_token}` },
					})
				).json();

				// Check if the user exists in our database, if not create them
				let user = await DB.users.one(userResponse.id);
				if (!user) {
					user = await DB.users.add({
						discordID: userResponse.id,
						discordUsername: userResponse.username,
						permissions: ["user"],
						description: "new user",
						joinedAt: new Date(),
						banned: false,
					});
				}

				// generate a session token for the user and store it in the sessions database
				const sessionToken = crypto.randomBytes(32).toString("hex");
				const expires = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
				await DB.sessions.add({
					token: sessionToken,
					expires: expires,
					discordID: user.discordID,
				});

				logger.info(`User ${user.discordUsername} (${user.discordID}) logged in via Discord OAuth2, session created with token ${sessionToken}`);

				// Finally redirect the user back to the homepage with the session token set as a cookie
				const maxAge = 7 * 24 * 60 * 60;
				res.writeHead(302, {
					Location: "/",
					"Set-Cookie": `session=${sessionToken}; HttpOnly; Path=/; Max-Age=${maxAge}`,
				});
				return res.end();
			} catch (err) {
				logger.info(`Error during discord OAuth2 process: ${err.message}`);
				res.writeHead(500, { "Content-Type": "text/html" });
				return res.end("<h1>Error: An error occurred during the Discord authentication process.</h1>");
			}
		}

		res.writeHead(404, { "Content-Type": "text/html" });
		return res.end("<h1>404 Not Found</h1>");
	},
};
