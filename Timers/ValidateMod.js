/**
 * @file ValidateMod.js
 * @description A timer script used to automatically validate unverified mods after they have been in the database for a configurable amount of time.
 * This implementation supports the auto-approval workflow for mods that have passed the waiting period without moderation action.
 */

var { MongoClient } = require('mongodb');
var colors = require("colors");
var Utils = require('./../utils');
const Mongo = require("../Shared/DB");
var log = new Utils.log.log(colors.green("Sandustry.Timer.Validate"), "./sandustry.Timer.main.txt", true);

var mongoUri = globalThis.Config.mongodb.uri;
var validationTime = globalThis.Config.ModSettings.validationTime;
/**
 * Namespace for Sandustry timer tasks related to mod validation.
 * @namespace ValidateMod
 * @memberof module:timers
 */
/**
 * Timer script that automatically validates unverified mods after they've been in the database for the configured time period.
 *
 * The script queries the MongoDB database for mods marked as unverified, checks if they've exceeded
 * the configured `validationTime` since their first upload, and if so, automatically marks them as verified.
 * This creates an auto-approval workflow where mods that haven't been explicitly reviewed within the waiting
 * period are considered safe for general use.
 *
 * A log entry is created in the Actions collection whenever a mod is auto-verified.
 *
 * @async
 * @function run
 * @memberof module:timers.ValidateMod
 *
 * @returns {Promise<void>} Resolves when the timer task has completed processing all unverified mods.
 *
 * @throws {Error} Logs an error if any issues occur during database connection or mod validation.
 *
 * @example
 * // Example of scheduling the timer
 * const validateMod = require('./Timers/ValidateMod');
 * setInterval(() => {
 *     validateMod.run().catch(err => console.error('Error in ValidateMod timer:', err));
 * }, 3600000); // Run every hour
 */
module.exports = {
    async run() {
        var client = new MongoClient(mongoUri);

        try {
            await client.connect();
            var db = client.db('SandustryMods');

            var modsCollection = db.collection('Mods');
            var modVersionsCollection = db.collection('ModVersions');

            var unverifiedMods = await modsCollection.find({ verified: false }).limit(100).toArray();
            if(unverifiedMods.length > 0){
                log.log(`Found ${unverifiedMods.length} unverified mod(s) to check.`);
                var now = new Date();

                for (var mod of unverifiedMods) {
                    var modVersion = await modVersionsCollection.findOne(
                        { modID: mod.modID },
                        { sort: { uploadTime: 1 } }
                    );

                    if (!modVersion) {
                        //log.log(`No version found for modID: ${mod.modID}. Skipping...`);
                        continue;
                    }
                    var uploadTime = new Date(modVersion.uploadTime);
                    var elapsedTime = (now - uploadTime);

                    if (elapsedTime > validationTime) {
                        await modsCollection.updateOne(
                            { modID: mod.modID },
                            { $set: { verified: true } }
                        );
                        var action = {
                            discordID: "Timer",
                            action: `Auto-Verified mod ${mod.modID}`,
                            time: new Date(),
                            logged:false
                        }
                        await Mongo.GetAction.Add(action)
                        //log.log(`ModID: ${mod.modID} verified successfully.`);
                    } else {
                        // log.log(`ModID: ${mod.modID} not yet eligible for verification. Validating at ${uploadTime + elapsedTime}`);
                    }
                }
            }
        } catch (error) {
            log.log(`Error verifying mods: ${error.message}`);
        } finally {
            await client.close();
        }

    }
};