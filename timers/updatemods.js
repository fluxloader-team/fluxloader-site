/**
 * @file updatemods.js
 * @description A timer to make sure ModDB data is using the latest mod version data from the ModVersions collection.
 * This timer ensures that mod metadata in the Mods collection stays synchronized with the latest version information.
 */

var Utils = require("../utils");
var mongo = require("../shared/db");
var log = new Utils.Log("sandustry.timer.moddata", "./sandustry.timer.main.txt", true);

/**
 * Namespace for Sandustry timer tasks.
 * @namespace updatemods
 * @memberof module:timers
 */
/**
 * Timer script to update mod metadata in the Mods collection based on the latest version data.
 *
 * This function retrieves mods in batches of 50, fetches their latest version data from the ModVersions collection,
 * and updates the main mod entries if their version information has changed. This ensures that search results
 * and mod listings always display the most current version information.
 *
 * @async
 * @function run
 * @memberof module:timers.updatemods
 *
 * @returns {Promise<void>} Resolves when the timer task has completed updating all mods.
 *
 * @throws {Error} Logs an error if any issues occur during database operations.
 *
 * @example
 * // Example of how this timer might be scheduled
 * const updatemods = require('./timers/updatemods');
 * setInterval(() => {
 *   updatemods.run().catch(err => console.error('Error in updatemods timer:', err));
 * }, 86400000); // Run once per day
 */
module.exports = {
	async run() {
		log.info("Updating mod data...");
		var page = 1;
		var MorePages = true;
		while (MorePages) {
			var Mods = await mongo.GetMod.Data.Search(JSON.stringify({ "modData.name": { $regex: "", $options: "i" } }), null, false, { number: page, size: 100 }, { _id: 1, modID: 1, modData: 1 });
			if (!Mods || Mods.length === 0) {
				MorePages = false;
			} else {
				//log.info(`Found ${Mods.length} mods`);
				var modIDs = Mods.map((mod) => mod.modID);
				var modDataList = await mongo.GetMod.Versions.Multiple(modIDs);
				var modDataMap = Object.fromEntries(modDataList.map((mod) => [mod.modID, mod.modData]));
				//log.info(`${JSON.stringify(modDataMap)}`)
				for (var mod of Mods) {
					var modData = modDataMap[mod.modID];

					if (mod.modData.version !== modData.version) {
						mod.modData.version = modData.version;
						await mongo.GetMod.Data.Update(mod.modID, mod);

						var action = {
							discordID: "Timer",
							action: `Updated mod ${mod.modID} to version ${modData.version}`,
							time: new Date(),
						};
						await mongo.GetAction.Add(action);
					}
					modData = null;
					mod = null;
				}
				modDataMap = null;
				modDataList = null;
				Mods = null;
				modIDs = null;

				page++;
			}
		}

		log.info("Mod data updated.");
	},
};
