const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Utils = require("./../../common/utils.js");
const DB = require("./../../common/db");

const logger = new Utils.Log("sandustry.bot.command.getModVersions", "./sandustry.bot.main.txt", true);

module.exports = {
	data: new SlashCommandBuilder()
		.setName("getmodversions")
		.setDescription("Gets the specified mod version list")
		.addStringOption((option) => option.setName("modid").setDescription("The ID of the mod you want to fetch versions for").setRequired(true)),

	async execute(interaction) {
		await interaction.deferReply();
		logger.info(`getting mod versions for ${interaction.options.getString("modid")}`);

		var modID = interaction.options.getString("modid");

		logger.info(`modID: ${modID}`);
		try {
			var modsList = await DB.getMod.versions.Numbers(modID);

			if (modsList.length == 0) {
				await interaction.editReply({ content: `Mod with ID \`${modID}\` was not found!` });
				return;
			}
			var embed = new EmbedBuilder().setTitle(`Mod ID: ${modID} - Versions`).setDescription(`This mod has ${modsList.length} version(s). Below is the version list:`).setColor(0x00aaff).setTimestamp();

			var versionsList = "";
			modsList.forEach((version) => {
				versionsList = `${versionsList}**Version:** ${version}\n`;
			});
			embed.addFields({ name: "Versions", value: versionsList });

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			logger.info(`Error fetching mod info: ${error}`);
			await interaction.editReply({ content: "An error occurred while fetching the mod info. Please try again later." });
		}
	},
};

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
