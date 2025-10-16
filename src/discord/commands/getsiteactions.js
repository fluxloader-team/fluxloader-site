/**
 * @file getsiteactions.js
 * @description Implements the `/getsiteactions` slash command for the discord bot. This command retrieves site actions.
 */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Utils = require("./../../common/utils.js");
const Mongo = require("./../../common/db");

const logger =new Utils.Log("sandustry.bot.command.getsiteactions", "./sandustry.bot.main.txt", true);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("getsiteactions")
		.setDescription("Gets site actions from search request")
		.addStringOption((option) => option.setName("query").setDescription("The search query (userID or action)").setRequired(true))
		.addIntegerOption((option) => option.setName("page").setDescription("The page number to show")),

	async execute(interaction) {
		await interaction.deferReply();
		logger.info(`getting site actions for ${interaction.options.getString("query")}`);
		var query = { $or: [{ discordID: { $regex: interaction.options.getString("query"), $options: "i" } }, { action: { $regex: interaction.options.getString("query"), $options: "i" } }] };
		//type of ActionEntry[]
		var Actions = await Mongo.GetAction.Get(query, { number: interaction.options.getInteger("page") || 1, size: 10 });
		try {
			var embed = new EmbedBuilder()
				.setTitle("Site Actions")
				.setDescription(`Results for your query: \`${interaction.options.getString("query")}\``)
				.setColor(0x00aeff);
			var page = interaction.options.getInteger("page") || 1;
			Actions.forEach((actionEntry, index) => {
				embed.addFields({
					name: `Action #${(page - 1) * 10 + (index + 1)}`,
					value: `**User ID**: ${actionEntry.discordID}\n**Action**: ${actionEntry.action}\n**Timestamp**: ${actionEntry.time.toISOString()}`,
					inline: false,
				});
			});
			await interaction.editReply({ embeds: [embed] });
		} catch (e) {
			logger.info(`Error fetching site actions: ${e}`);
			await interaction.editReply({ content: "An error occurred while fetching the site actions. Please try again later." });
		}
	},
};

class ActionEntry {
	discordID = "";
	action = "";
	time = new Date();
}
function formatDependencies(dependencies) {
	if (!dependencies || typeof dependencies !== "object") return null;
	return Object.entries(dependencies)
		.map(([name, version]) => `**${name}**: ${version}`)
		.join("\n");
}

function truncateDescription(description, limit = 1024) {
	if (description.length <= limit) return description;
	return description.substring(0, limit - 3) + "...";
}
