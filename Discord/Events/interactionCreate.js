const { Client, Events, GatewayIntentBits } = require('discord.js');
var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var { exec } = require('child_process');
var Utils = require('./../../utils')
var path = require('path');

const log = new Utils.log.log(colors.green("Sandustry.bot.event.interactionCreate"), "./sandustry.bot.main.txt", true);
process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

module.exports = {
    run: async (interaction) => {
        log.log(`Interaction: ${interaction.commandName}`)
        if (!interaction.isCommand()) return;

        var command = globalThis.BotCommands.get(interaction.commandName);
        if (!command) {
            await interaction.reply({ content: `Command \`${interaction.commandName}\` not found.`, ephemeral: true });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing command ${interaction.commandName}:`, error);

            await interaction.reply({ 
                content: 'There was an error while executing this command. Please try again later.', 
                ephemeral: true 
            });
        }
    },
};