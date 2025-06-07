/**
 * @file validatemod.js
 * @description A timer script used to automatically validate unverified mods after they have been in the database for a configurable amount of time.
 * This implementation supports the auto-approval workflow for mods that have passed the waiting period without moderation action.
 */

var Utils = require("../utils");
const mongo = require("../shared/db");
var log = new Utils.Log("sandustry.timer.Validate", "./sandustry.timer.main.txt", true);
var validationTime = globalThis.config.ModSettings.validationTime;

/**
 * Namespace for Sandustry timer tasks related to mod validation.
 * @namespace validatemod
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
 * @memberof module:timers.validatemod
 *
 * @returns {Promise<void>} Resolves when the timer task has completed processing all unverified mods.
 *
 * @throws {Error} Logs an error if any issues occur during database connection or mod validation.
 *
 * @example
 * // Example of scheduling the timer
 * const validatemod = require('./timers/validatemod');
 * setInterval(() => {
 *     validatemod.run().catch(err => console.error('Error in validatemod timer:', err));
 * }, 3600000); // Run every hour
 */
module.exports = {
	async run() {
		try {
			// Get all unverified mods
			var unverifiedMods = await mongo.GetMod.Data.FindUnverified();
			if (unverifiedMods.length > 0) {
				log.info(`Found ${unverifiedMods.length} unverified mod(s) to check.`);
				var now = new Date();

				for (var mod of unverifiedMods) {
					// Get the oldest version of the mod
					var modVersion = await mongo.GetMod.Versions.Oldest(mod.modID);

					if (!modVersion) {
						//log.info(`No version found for modID: ${mod.modID}. Skipping...`);
						continue;
					}

					var uploadTime = new Date(modVersion.uploadTime);
					var elapsedTime = now - uploadTime;

					if (elapsedTime > validationTime) {
						// Update the mod to be verified
						mod.verified = true;
						await mongo.GetMod.Data.Update(mod.modID, mod);

						// Log the action
						var action = {
							discordID: "Timer",
							action: `Auto-Verified mod ${mod.modID}`,
							time: new Date(),
							logged: false,
						};
						await mongo.GetAction.Add(action);
						//log.info(`ModID: ${mod.modID} verified successfully.`);
					} else {
						// log.info(`ModID: ${mod.modID} not yet eligible for verification. Validating at ${uploadTime + elapsedTime}`);
					}
				}
			}
		} catch (error) {
			log.info(`Error verifying mods: ${error.message}`);
		}
	},
};
