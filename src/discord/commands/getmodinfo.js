const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const Utils = require("../../../common/utils.js");
const db = require("../../../common/db");

const logger = new Utils.Log("discordbot.command.getmodinfo");

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

module.exports = {
	data: new SlashCommandBuilder()
		.setName("getmodinfo")
		.setDescription("Gets the specified mod info")
		.addStringOption((option) => option.setName("modid").setDescription("The ID of the mod you want to fetch information for").setRequired(true))
		.addStringOption((option) => option.setName("version").setDescription("The version of the mod").setRequired(true)),

	/**
	 * @param {import("discord.js").ChatInputCommandInteraction} interaction
	 */
	async execute(interaction) {
		await interaction.deferReply();
		logger.info(`getting mod info for ${interaction.options.getString("modid")}`);

		var modID = interaction.options.getString("modid");
		var version = interaction.options.getString("version") || "";

		logger.info(`modID: ${modID}, version: ${version}`);
		logger.info("connecting to database");
		try {
			modData = await db.mods.versions.one(modID, version, { modfile: 0 });

			if (!modData) {
				await interaction.editReply({ content: `Mod with ID \`${modID}\` and version \`${version}\` was not found!` });
				return;
			}

			var embed = new EmbedBuilder()
				.setColor(0x00aaff)
				.setTitle(modData.modData.name)
				.setDescription(modData.modData.shortDescription || "No description provided")
				.addFields(
					{ name: "Author", value: modData.modData.author || "Unknown", inline: true },
					{ name: "Version", value: modData.modData.version, inline: true },
					{ name: "Fluxloader Version", value: modData.modData.fluxloaderVersion || "N/A", inline: true },
					{ name: "Tags", value: modData.modData.tags.join(", ") || "None" },
					{
						name: "Dependencies",
						value: formatDependencies(modData.modData.dependencies) || "None",
					}
				)
				.addFields({ name: "Upload Time", value: new Date(modData.uploadTime).toLocaleString(), inline: true }, { name: "Downloads", value: modData.downloadCount.toString() || "0", inline: true })
				.addFields(
					{ name: "Electron Entrypoint", value: modData.modData.electronEntrypoint || "None", inline: false },
					{ name: "Game Entrypoint", value: modData.modData.gameEntrypoint || "None", inline: true },
					{ name: "Worker Entrypoint", value: modData.modData.workerEntrypoint || "None", inline: true }
				);

			if (modData.modData.description) {
				embed.addFields({ name: "Description", value: truncateDescription(modData.modData.description) });
			}

			await interaction.editReply({ embeds: [embed] });
		} catch (error) {
			logger.info(`Error fetching mod info: ${error}`);
			await interaction.editReply({ content: "An error occurred while fetching the mod info. Please try again later." });
		}
	},
};
