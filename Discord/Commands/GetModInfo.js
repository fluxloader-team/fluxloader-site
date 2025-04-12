var { SlashCommandBuilder } = require('discord.js');
var colors = require("colors");
var http = require("http");
var os = require("os");
var Websocket = require("ws");
var crypto = require("crypto");
var util = require("util");
var fs = require("fs");
var ejs = require("ejs");
var { exec } = require("child_process");
var Utils = require("./../../utils");
var { MongoClient } = require("mongodb");
var { compress, decompress } = require("@mongodb-js/zstd");
var https = require("https");
var JSZip = require("jszip");
var log = new Utils.log.log(colors.green("Sandustry.bot.command.GetModInfo"), "./sandustry.bot.main.txt", true);
var mongoUri = globalThis.Config.mongodb.uri;

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

    async execute(interaction) {
        await interaction.deferReply();

        var modID = interaction.options.getString('modid');
        var version = interaction.options.getString('version');

        var client = new MongoClient(mongoUri);
        try {
            await client.connect();
            var db = client.db('SandustryMods');
            var versionsCollection = db.collection('ModVersions');

            var modQuery = { modID: modID, 'modData.version': version };
            var modData = await versionsCollection.findOne(modQuery, { projection: { modfile: 0 } });

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
                    { name: 'Electron Entrypoint', value: modData.modData.electronEntrypoint || 'None', inline: true },
                    { name: 'Browser Entrypoint', value: modData.modData.browserEntrypoint || 'None', inline: true },
                    { name: 'Worker Entrypoint', value: modData.modData.workerEntrypoint || 'None', inline: true })

            if (modData.modData.description) {
                embed.addFields({ name: 'Description', value: truncateDescription(modData.modData.description) });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            log.error(`Error fetching mod info: ${error}`);
            await interaction.editReply({ content: 'An error occurred while fetching the mod info. Please try again later.' });
        } finally {
            await client.close();
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
