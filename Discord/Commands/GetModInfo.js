const { SlashCommandBuilder } = require('discord.js');
var colors = require("colors");
var http = require("http");
var os = require("os");
var Websocket = require("ws");
var crypto = require("crypto");
var util = require("util");
var fs = require("fs");
var ejs = require("ejs");
var { exec } = require("child_process");
var Utils = require("./../utils");
var { MongoClient } = require("mongodb");
var { compress, decompress } = require("@mongodb-js/zstd");
var https = require("https");
var JSZip = require("jszip");
const log = new Utils.log.log(colors.green("Sandustry.bot.command.GetModInfo"), "./sandustry.bot.main.txt", true);
var mongoUri = globalThis.Config.mongodb.uri;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('GetModInfo')
        .setDescription('Gets the specified mod info'),
    async execute(interaction) {
        await interaction.deferReply();
        var client = new MongoClient(mongoUri);
        await client.connect();
        var db = client.db("SandustryMods");
        var versionsCollection = db.collection("ModVersions");
        var modVersion = await versionsCollection.find(modQuery).sort({ uploadTime: -1 }).project({ modfile: 0 }).limit(1).toArray();
        await client.close();
        interaction.reply({ content: "Mod info" });
    },
};