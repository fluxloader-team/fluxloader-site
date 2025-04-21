/**
 * @file LogActions.js
 * @description logs unlogged actions to the discord
 */

var { MongoClient } = require('mongodb');
var colors = require("colors");
var Utils = require('./../utils');
const Mongo = require("../Shared/DB");
var log = new Utils.log.log(colors.green("Sandustry.Timer.ActionLog"), "./sandustry.Timer.main.txt", true);
var validationTime = globalThis.Config.ModSettings.validationTime;
/**
 * Namespace for Sandustry bot timer tasks.
 * @namespace LogActions
 * @memberof module:timers
 */
/**
 *
 * @async
 * @function run
 * @memberof module:timers.LogActions
 *
 * @returns {Promise<void>} Resolves when the timer task has completed processing.
 *
 * @throws {Error} Logs an error if any issues occur during database connection or mod validation.
 *
 */
module.exports = {
    async run() {
        var unloggedActions = await Mongo.GetAction.Get({"logged":false})
        unloggedActions = unloggedActions.splice(0,5)
        for(var action of unloggedActions) {
            action.logged = true;
            await Mongo.GetAction.Update(action);
            await globalThis.Discord.client.channels.cache.get(globalThis.Config.discord.serverActionsChannel).send(`Site Action: ${action.action} by ${action.discordID}`)
        }
    }
};