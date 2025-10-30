const querystring = require("querystring");
const Utils = require("../../common/utils.js");

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

		if (pathname === "/auth/discord") {
			var authURL = `https://discord.com/oauth2/authorize?client_id=${globalThis.config.discord.clientId}&redirect_uri=${encodeURIComponent(globalThis.config.discord.redirectUri)}&response_type=code&scope=identify`;
			logger.info("Redirecting to discord Authorization URL...");
			res.writeHead(302, { Location: authURL });
			return res.end();
		}

		if (pathname === "/auth/discord/callback") {
			var code = queryParams.code;
			if (!code) {
				res.writeHead(400, { "Content-Type": "text/html" });
				return res.end('<h1>Error: Missing "code" parameter in the callback URL.</h1>');
			}

			try {
				logger.info(`Received code: ${code}`);
				var tokenData = querystring.stringify({
					client_id: globalThis.config.discord.clientId,
					client_secret: globalThis.config.discord.clientSecret,
					grant_type: "authorization_code",
					code: code,
					redirect_uri: globalThis.config.discord.redirectUri,
				});

				var tokenResponse = await (await fetch("https://discord.com/api/oauth2/token", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded"
					},
					body: tokenData
				})).json()

				logger.info(`Token Response: ${JSON.stringify(tokenResponse)}`);
				if (!tokenResponse.access_token) {
					res.writeHead(500, { "Content-Type": "text/html" });
					return res.end("<h1>Error: Failed to retrieve access token from discord.</h1>");
				}


				// https://discord.com/developers/docs/resources/user#get-current-user
				const userResponse = await (await fetch("https://discord.com/api/users/@me", {
					method: "GET",
					headers: {
						Authorization: `Bearer ${tokenResponse.access_token}`
					}
				})).json();

				logger.info(`User Response: ${JSON.stringify(userResponse)}`);
				userResponse.tokenResponse = tokenResponse;
				res.writeHead(200, { "Content-Type": "text/html" });
				return res.end(`<script>
                        localStorage.setItem('discordUser', JSON.stringify(${JSON.stringify(userResponse)}));
                        window.location.href = '/';
                    </script>
`);
			} catch (err) {
				logger.info(`Error during discord OAuth2 process: ${err.message}`);
				res.writeHead(500, { "Content-Type": "text/html" });
				return res.end("<h1>Error: Something went wrong during the discord authentication process.</h1>");
			}
		}

		res.writeHead(404, { "Content-Type": "text/html" });
		return res.end("<h1>404: Not Found</h1>");
	},
};
