var querystring = require("querystring");
var https = require("https");
var Utils = require("../../common/utils.js");

var log = new Utils.Log("sandustry.web.pages.discord", "./sandustry.web.main.txt", true);

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

module.exports = {
	paths: ["/auth/discord", "/auth/discord/callback"],

	run: async function (req, res) {
		var urlSplit = req.url.split("?");
		var pathname = urlSplit[0];
		var queryParams = querystring.parse(urlSplit[1] || "");

		if (pathname === "/auth/discord") {
			var authURL = `https://discord.com/oauth2/authorize?client_id=${globalThis.config.discord.clientId}&redirect_uri=${encodeURIComponent(globalThis.config.discord.redirectUri)}&response_type=code&scope=identify`;
			log.info("Redirecting to discord Authorization URL...");
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
					client_id: globalThis.config.discord.clientId,
					client_secret: globalThis.config.discord.clientSecret,
					grant_type: "authorization_code",
					code: code,
					redirect_uri: globalThis.config.discord.redirectUri,
				});

				var tokenResponse = await makeRequest("discord.com", "/api/oauth2/token", "POST", { "Content-Type": "application/x-www-form-urlencoded" }, tokenData);

				log.info(`Token Response: ${JSON.stringify(tokenResponse)}`);
				if (!tokenResponse.access_token) {
					res.writeHead(500, { "Content-Type": "text/html" });
					return res.end("<h1>Error: Failed to retrieve access token from discord.</h1>");
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
				log.info(`Error during discord OAuth2 process: ${err.message}`);
				res.writeHead(500, { "Content-Type": "text/html" });
				return res.end("<h1>Error: Something went wrong during the discord authentication process.</h1>");
			}
		}

		res.writeHead(404, { "Content-Type": "text/html" });
		return res.end("<h1>404: Not Found</h1>");
	},
};
