/**
 * @file searchmods.js
 * @description Implements the `/searchmods` slash command for the Discord bot. This command allows users to search for mods by name or tags and receive detailed results.
 */

var { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
var colors = require("colors");
var Utils = require('./../../utils'); // Adjust this accordingly
var log = new Utils.log.log("Sandustry.bot.command.SearchMods", "./sandustry.bot.main.txt", true);
var Mongo = require("./../../Shared/DB");
/**
 * Namespace for Discord bot commands.
 * @namespace searchMods
 * @memberof module:discord.Commands
 */
/**
 * Slash command definition and execution logic for `/searchmods`.
 *
 * This command searches a mod database (via MongoDB) for mods that match the given query and optionally filters by verification status.
 * It supports paginated results up to 10 mods per page.
 *
 * @type {Object}
 * @property data - The slash command structure for `/searchmods`.
 * @property {Function} execute - The logic to process the command when invoked.
 * @memberof module:discord.Commands.searchMods
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('searchmods')
        .setDescription('Search for mods by name or tags')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('The search query (mod name or tags)')
                .setRequired(true))
        .addBooleanOption(option =>
            option
                .setName('verifiedonly')
                .setDescription('Only show verified mods')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('page')
                .setDescription('The page number to show')),
    /**
     * Executes the `/searchmods` command.
     *
     * @async
     * @function execute
     * @memberof module:discord.Commands.searchMods
     * @param interaction - The interaction object representing the command invocation.
     *
     * @returns {Promise<void>} Resolves when the command's logic is complete and a reply has been sent.
     *
     * @throws {Error} Logs an error and sends an error response to the user if something goes wrong during command execution.
     *
     * @example
     * // Example usage in Discord
     * /searchmods query:<search-term> verifiedonly:<true|false> page:<page-number>
     */
    async execute(interaction) {
        await interaction.deferReply();

        var query = interaction.options.getString('query');
        log.log(`Searching mods for query: ${query}`);
        var searchResults = await Mongo.GetMod.Data.Search(query, interaction.options.getBoolean('verifiedOnly'),false,{number:interaction.options.getInteger('page') || 1,size:10});
        try {
            if (searchResults.length === 0) {
                await interaction.editReply({ content: `No mods found matching the query: \`${query}\`.` });
                return;
            }

            // Create a response embed
            var embed = new EmbedBuilder()
                .setTitle('Search Results')
                .setDescription(`Found ${searchResults.length} mod(s) matching the query: \`${query}\``)
                .setColor(0x00AAFF)
                .setTimestamp();

            var limitedResults = []
            if (searchResults.length > 10) {
                limitedResults = searchResults.slice(0, 10);
                embed.setFooter({ text: 'Showing the first 10 results. Please refine your query for more specific results.' });
            }else{
                limitedResults = searchResults;
            }

            for (var mod of limitedResults) {
                embed.addFields({
                    name: mod.modData.name,
                    value: `**Version:** ${mod.modData.version}\n` +
                        `**Author:** ${mod.modData.author || 'Unknown'}\n` +
                        `**Tags:** ${mod.modData.tags.join(', ') || 'None'}\n` +
                        `**Short Description:** ${truncateDescription(mod.modData.shortDescription) || 'None'}`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            log.log(`Error searching mods: ${error}`);
            await interaction.editReply({ content: 'An error occurred while searching for mods. Please try again later.' });
        }
    }
};

function truncateDescription(description, limit = 100) {
    if (!description || description.length <= limit) return description || 'No description provided';
    return description.substring(0, limit - 3) + '...';
}