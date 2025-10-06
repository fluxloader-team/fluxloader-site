/**
 * @file getmodversions.js
 * @description Implements the `/getmodversions` slash command for the discord bot. This command allows users to fetch and view a list of versions for a specified mod.
 */

var { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
var Utils = require("./../../common/utils.js");
var log = new Utils.Log("sandustry.bot.command.GetModVersions", "./sandustry.bot.main.txt", true);
var Mongo = require("./../../common/db");
/**
 * Namespace for discord bot commands.
 * @namespace GetModVersions
 * @memberof module:discord.commands
 */
/**
 * Slash command definition and execution logic for `/getmodversions`.
 *
 * This command fetches a list of all available versions for a specific mod based on its ID.
 *
 * @type {Object}
 * @property data - The slash command structure for `/getmodversions`.
 * @property {Function} execute - The logic to process the command when invoked.
 * @memberof module:discord.commands.GetModVersions
 */
module.exports = {
	data: new SlashCommandBuilder()
		.setName("getmodversions")
		.setDescription("Gets the specified mod version list")
		.addStringOption((option) => option.setName("modid").setDescription("The ID of the mod you want to fetch versions for").setRequired(true)),
	/**
	 * Executes the `/getmodversions` command.
	 *
	 * @async
	 * @function execute
	 * @memberof module:discord.commands.GetModVersions
	 * @param interaction - The interaction object representing the command invocation.
	 *
	 * @returns {Promise<void>} Resolves when the command's logic is complete and a reply has been sent.
	 *
	 * @throws {Error} Logs an error and sends an error response to the user if something goes wrong during command execution.
	 *
	 * @example
	 * // Example usage in discord
	 * /getmodversions modid:<mod-id>
	 */
	async execute(interaction) {
		await interaction.deferReply();
		log.info(`getting mod versions for ${interaction.options.getString("modid")}`);

		var modID = interaction.options.getString("modid");

		log.info(`modID: ${modID}`);
		try {
			var modsList = await Mongo.GetMod.Versions.Numbers(modID);

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
			log.info(`Error fetching mod info: ${error}`);
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
