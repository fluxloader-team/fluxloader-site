/**
 * @file discordauth.js
 * @description Handles Discord OAuth2 authentication and callback processing for the application.
 * Supports user redirection to the Discord authorization URL and processes the callback to retrieve user information.
 */

var querystring = require("querystring");
var https = require("https");
var Utils = require("./../utils");

var log = new Utils.log.log("Sandustry.web.pages.discord", "./sandustry.web.main.txt", true);

/**
 * Namespace for Discord authentication functionality in the API.
 * @namespace discordAuth
 * @memberof module:web
 */
module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:web.discordAuth
	 */
	paths: ["/auth/discord", "/auth/discord/callback"],
	/**
	 * Handles Discord OAuth2 authentication and callback.
	 *
	 * - `/auth/discord`: Redirects the client to Discord's OAuth2 authorization URL.
	 * - `/auth/discord/callback`: Processes the OAuth2 callback, retrieves user information, and stores it in the browser's local storage.
	 *
	 * ### Query Parameters:
	 * - **code**: *(required for `/auth/discord/callback`)*
	 *   The OAuth2 authorization code returned by Discord after user authentication.
	 *   - *Example*: `code=abcdef123456`
	 *
	 * @async
	 * @function run
	 * @memberof api.discordAuth
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @throws {Error} If query parameters are missing, invalid, or an error occurs during API requests.
	 */
	run: async function (req, res) {
		var urlSplit = req.url.split("?");
		var pathname = urlSplit[0];
		var queryParams = querystring.parse(urlSplit[1] || "");

		if (pathname === "/auth/discord") {
			var authURL = `https://discord.com/oauth2/authorize?client_id=${globalThis.Config.discord.clientId}&redirect_uri=${encodeURIComponent(globalThis.Config.discord.redirectUri)}&response_type=code&scope=identify`;
			log.info("Redirecting to Discord Authorization URL...");
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
				log.info(`Received code: ${code}`);
				var tokenData = querystring.stringify({
					client_id: globalThis.Config.discord.clientId,
					client_secret: globalThis.Config.discord.clientSecret,
					grant_type: "authorization_code",
					code: code,
					redirect_uri: globalThis.Config.discord.redirectUri,
				});

				var tokenResponse = await makeRequest("discord.com", "/api/oauth2/token", "POST", { "Content-Type": "application/x-www-form-urlencoded" }, tokenData);

				log.info(`Token Response: ${JSON.stringify(tokenResponse)}`);
				if (!tokenResponse.access_token) {
					res.writeHead(500, { "Content-Type": "text/html" });
					return res.end("<h1>Error: Failed to retrieve access token from Discord.</h1>");
				}

				var userResponse = await makeRequest("discord.com", "/api/users/@me", "GET", { Authorization: `Bearer ${tokenResponse.access_token}` });

				log.info(`User Response: ${JSON.stringify(userResponse)}`);
				userResponse.tokenResponse = tokenResponse;
				res.writeHead(200, { "Content-Type": "text/html" });
				return res.end(`<script>
                        localStorage.setItem('discordUser', JSON.stringify(${JSON.stringify(userResponse)}));
                        window.location.href = '/';
                    </script>
`);
			} catch (err) {
				log.info(`Error during Discord OAuth2 process: ${err.message}`);
				res.writeHead(500, { "Content-Type": "text/html" });
				return res.end("<h1>Error: Something went wrong during the Discord authentication process.</h1>");
			}
		}

		res.writeHead(404, { "Content-Type": "text/html" });
		return res.end("<h1>404: Not Found</h1>");
	},
};

function makeRequest(host, path, method, headers, postData) {
	return new Promise((resolve, reject) => {
		var options = {
			host: host,
			path: path,
			method: method,
			headers: headers,
		};

		var req = https.request(options, (res) => {
			var data = "";

			res.on("data", (chunk) => {
				data += chunk;
			});

			res.on("end", () => {
				try {
					resolve(JSON.parse(data));
				} catch (err) {
					reject(new Error("Failed to parse JSON response: " + data));
				}
			});
		});

		req.on("error", (err) => {
			reject(err);
		});

		if (postData) {
			req.write(postData);
		}

		req.end();
	});
}
