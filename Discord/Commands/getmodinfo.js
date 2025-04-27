/**
 * @file getmodinfo.js
 * @description Implements the `/getmodinfo` slash command for the Discord bot. This command retrieves detailed information about a specific mod and its version.
 */

var { SlashCommandBuilder,EmbedBuilder } = require('discord.js');
var colors = require("colors");
var Utils = require("./../../utils");
var log = new Utils.log.log("Sandustry.bot.command.GetModInfo", "./sandustry.bot.main.txt", true);
var Mongo = require("./../../Shared/DB");
/**
 * Namespace for Discord bot commands.
 * @namespace getModInfo
 * @memberof module:discord.Commands
 */
/**
 * Slash command definition and execution logic for `/getmodinfo`.
 *
 * This command retrieves information about a specific mod, including its name, description, author, version, dependencies, and more.
 *
 * @type {Object}
 * @property data - The slash command structure for `/getmodinfo`.
 * @property {Function} execute - The logic to process the command when invoked.
 * @memberof module:discord.Commands.getModInfo
 */
module.exports = {
    data: new SlashCommandBuilder()
        .setName('getmodinfo')
        .setDescription('Gets the specified mod info')
        .addStringOption(option =>
            option
                .setName('modid')
                .setDescription('The ID of the mod you want to fetch information for')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('version')
                .setDescription('The version of the mod')
                .setRequired(true)),
    /**
     * Executes the `/getmodinfo` command.
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
     * @example
     * // Example usage in Discord
     * /getmodinfo modid:<mod-id> version:<mod-version>
     */
    async execute(interaction) {
        await interaction.deferReply();
        log.log(`getting mod info for ${interaction.options.getString('modid')}`)

        var modID = interaction.options.getString('modid');
        var version = interaction.options.getString('version');

        log.log(`modID: ${modID}, version: ${version}`)
        log.log("connecting to database")
        try {

            var modData = {}
            if(version != ""){
                modData = Mongo.GetMod.Versions.One(modID,version,{ modfile: 0});
            }else{
                modData = Mongo.GetMod.Versions.One(modID,"",{ modfile: 0});
            }

            if (!modData) {
                await interaction.editReply({ content: `Mod with ID \`${modID}\` and version \`${version}\` was not found!` });
                return;
            }

            var embed = new EmbedBuilder()
                .setColor(0x00AAFF)
                .setTitle(modData.modData.name)
                .setDescription(modData.modData.shortDescription || 'No description provided')
                .addFields(
                    { name: 'Author', value: modData.modData.author || 'Unknown', inline: true },
                    { name: 'Version', value: modData.modData.version, inline: true },
                    { name: 'Modloader Version', value: modData.modData.modloaderVersion || 'N/A', inline: true },
                    { name: 'Tags', value: modData.modData.tags.join(', ') || 'None' },
                    {
                        name: 'Dependencies',
                        value: formatDependencies(modData.modData.dependencies) || 'None'
                    }
                )
                .addFields(
                    { name: 'Upload Time', value: new Date(modData.uploadTime).toLocaleString(), inline: true },
                    { name: 'Downloads', value: modData.downloadCount.toString() || '0', inline: true }
                ).addFields(
                    { name: 'Electron Entrypoint', value: modData.modData.electronEntrypoint || 'None', inline: false },
                    { name: 'Browser Entrypoint', value: modData.modData.browserEntrypoint || 'None', inline: true },
                    { name: 'Worker Entrypoint', value: modData.modData.workerEntrypoint || 'None', inline: true })

            if (modData.modData.description) {
                embed.addFields({ name: 'Description', value: truncateDescription(modData.modData.description) });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            log.log(`Error fetching mod info: ${error}`);
            await interaction.editReply({ content: 'An error occurred while fetching the mod info. Please try again later.' });
        }
    }
};


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
