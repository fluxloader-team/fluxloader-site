var Utils = require("../common/utils.js");
const mongo = require("../common/db");
var log = new Utils.Log("sandustry.timer.Validate", "./sandustry.timer.main.txt", true);
var validationTime = globalThis.config.ModSettings.validationTime;

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
