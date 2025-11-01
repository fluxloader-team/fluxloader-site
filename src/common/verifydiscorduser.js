module.exports = {
	/**
	 * @param {string} userId Discord Snowflake
	 * @param {string} accessToken Discord user access token
	 * @returns {Promise<boolean>} If the user is verified or not
	 */
	verifyDiscordUser: async (userId, accessToken) => {
		const res = await fetch("https://discord.com/api/users/@me", {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		});

		if (res.status !== 200) return false;

		// https://discord.com/developers/docs/resources/user#get-current-user
		const responseBody = await res.json();
		return responseBody?.id !== userId;
	},
};
