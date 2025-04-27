/**
 * @file getsiteactions.js
 * @description Implements the `/getsiteactions` slash command for the Discord bot. This command retrieves site actions.
 */

var { SlashCommandBuilder,EmbedBuilder } = require('discord.js');
var colors = require("colors");
var Utils = require("./../../utils");
var log = new Utils.log.log("Sandustry.bot.command.getsiteactions", "./sandustry.bot.main.txt", true);
var Mongo = require("./../../Shared/DB");
/**
 * Namespace for Discord bot commands.
 * @namespace getSiteActions
 * @memberof module:discord.Commands
 */
/**
 * Slash command definition and execution logic for `/getsiteactions`.
 *
 * @type {Object}
 * @property data - The slash command structure for `/getsiteactions`.
 * @property {Function} execute - The logic to process the command when invoked.
 * @memberof module:discord.Commands.getModInfo
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('getsiteactions')
        .setDescription('Gets site actions from search request')
        .addStringOption(option =>
            option
                .setName('query')
                .setDescription('The search query (userID or action)')
                .setRequired(true))
            .addIntegerOption(option =>
                option
                    .setName('page')
                    .setDescription('The page number to show')),
    /**
     * Executes the `/getsiteactions` command.
     *
     * @async
     * @function execute
     * @memberof module:discord.Commands.getModInfo
     * @param interaction - The interaction object representing the command invocation.
     *
     * @returns {Promise<void>} Resolves when the command's logic is complete and a reply has been sent.
     *
     * @throws {Error} Logs an error and sends an error response to the user if something goes wrong during command execution.
     *
     */
    async execute(interaction) {
        await interaction.deferReply();
        log.log(`getting site actions for ${interaction.options.getString('query')}`)
        var query = {$or: [
                { "discordID": { $regex:interaction.options.getString('query') , $options: 'i' } },
                { "action": { $regex:interaction.options.getString('query') , $options: 'i' } }
            ]}
        //type of ActionEntry[]
        var Actions = await Mongo.GetAction.Get(query,{number:interaction.options.getInteger('page') || 1,size:10});
        try{
            var embed = new EmbedBuilder()
                .setTitle('Site Actions')
                .setDescription(`Results for your query: \`${interaction.options.getString('query')}\``)
                .setColor(0x00AEFF)
            var page = interaction.options.getInteger('page') || 1;
            Actions.forEach((actionEntry, index) => {
                embed.addFields({
                    name: `Action #${(page - 1) * 10 + (index + 1)}`,
                    value: `**User ID**: ${actionEntry.discordID}\n**Action**: ${actionEntry.action}\n**Timestamp**: ${actionEntry.time.toISOString()}`,
                    inline: false
                });
            });
            await interaction.editReply({ embeds: [embed] });
        }catch(e){
            log.log(`Error fetching site actions: ${e}`)
            await interaction.editReply({ content: 'An error occurred while fetching the site actions. Please try again later.' });
        }
    }
};

class ActionEntry {
    discordID = "";
    action = "";
    time = new Date();
}
function formatDependencies(dependencies) {
    if (!dependencies || typeof dependencies !== 'object') return null;
    return Object.entries(dependencies)
        .map(([name, version]) => `**${name}**: ${version}`)
        .join('\n');
}

function truncateDescription(description, limit = 1024) {
    if (description.length <= limit) return description;
    return description.substring(0, limit - 3) + '...';
}
