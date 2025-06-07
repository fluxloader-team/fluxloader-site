export default function verifyDiscordUser(userId, accessToken) {
	return new Promise((resolve, reject) => {
		var options = {
			hostname: "discord.com",
			path: "/api/users/@me",
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		};

		var req = require("https").request(options, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk.toString();
			});

			res.on("end", () => {
				try {
					var userResponse = JSON.parse(data);

					// Check if the user ID matches the ID from the token response
					if (res.statusCode === 200 && userResponse.id === userId) {
						resolve(true);
					} else {
						console.warn("User ID mismatch or token is invalid:", userResponse);
						resolve(false);
					}
				} catch (err) {
					console.error("Error parsing user verification response:", err);
					resolve(false);
				}
			});
		});

		req.on("error", (err) => {
			console.error("Error verifying discord user:", err);
			resolve(false);
		});

		req.end();
	});
}
