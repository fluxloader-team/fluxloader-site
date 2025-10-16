/**
 * @file searchmods.js
 * @description Implements the `/searchmods` slash command for the discord bot. This command allows users to search for mods by name or tags and receive detailed results.
 */

const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Utils = require("./../../common/utils.js"); // Adjust this accordingly
const Mongo = require("./../../common/db");

const logger =new Utils.Log("sandustry.bot.command.SearchMods", "./sandustry.bot.main.txt", true);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("searchmods")
		.setDescription("Search for mods by name or tags")
		.addStringOption((option) => option.setName("query").setDescription("The search query (mod name or tags)").setRequired(true))
		.addBooleanOption((option) => option.setName("verifiedonly").setDescription("Only show verified mods").setRequired(true))
		.addIntegerOption((option) => option.setName("page").setDescription("The page number to show")),

	async execute(interaction) {
		await interaction.deferReply();

		var query = interaction.options.getString("query");
		logger.info(`Searching mods for query: ${query}`);
		var searchResults = await Mongo.GetMod.Data.Search(query, interaction.options.getBoolean("verifiedOnly"), false, { number: interaction.options.getInteger("page") || 1, size: 10 });
		try {
			if (searchResults.length === 0) {
				await interaction.editReply({ content: `No mods found matching the query: \`${query}\`.` });
				return;
			}

			// Create a response embed
			var embed = new EmbedBuilder().setTitle("Search Results").setDescription(`Found ${searchResults.length} mod(s) matching the query: \`${query}\``).setColor(0x00aaff).setTimestamp();

			var limitedResults = [];
			if (searchResults.length > 10) {
				limitedResults = searchResults.slice(0, 10);
				embed.setFooter({ text: "Showing the first 10 results. Please refine your query for more specific results." });
			} else {
				limitedResults = searchResults;
			}

			for (var mod of limitedResults) {
				embed.addFields({
					name: mod.modData.name,
					value:
						`**Version:** ${mod.modData.version}\n` +
						`**Author:** ${mod.modData.author || "Unknown"}\n` +
						`**Tags:** ${mod.modData.tags.join(", ") || "None"}\n` +
						`**Short Description:** ${truncateDescription(mod.modData.shortDescription) || "None"}`,
					inline: false,
				});
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			logger.info(`Error searching mods: ${error}`);
			await interaction.editReply({ content: "An error occurred while searching for mods. Please try again later." });
		}
	},
};

function truncateDescription(description, limit = 100) {
	if (!description || description.length <= limit) return description || "No description provided";
	return description.substring(0, limit - 3) + "...";
}
