/**
 * @file ValidateMod.js
 * @description A timer script used to periodically check for and validate unverified mods in the database. Runs as a timed task from `index.js`.
 */

var { MongoClient } = require('mongodb');
var colors = require("colors");
var Utils = require('./../utils');
const Mongo = require("../Shared/DB");
var log = new Utils.log.log(colors.green("Sandustry.Timer.Validate"), "./sandustry.Timer.main.txt", true);

var mongoUri = globalThis.Config.mongodb.uri;
var validationTime = globalThis.Config.ModSettings.validationTime;
/**
 * Namespace for Sandustry bot timer tasks.
 * @namespace ValidateMod
 * @memberof module:timers
 */
/**
 * Timer script to validate unverified mods.
 *
 * The script connects to the MongoDB database, identifies mods marked as unverified, and validates those that have
 * exceeded the configured `validationTime` since upload.
 *
 * @async
 * @function run
 * @memberof module:timers.ValidateMod
 *
 * @returns {Promise<void>} Resolves when the timer task has completed processing.
 *
 * @throws {Error} Logs an error if any issues occur during database connection or mod validation.
 *
 * @example
 * // Example of running the timer
 * const validateMod = require('./ValidateMod');
 * setInterval(() => {
 *     validateMod.run();
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