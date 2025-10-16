const Utils = require("../common/utils.js");
const DB = require("../common/db");

const logger = new Utils.Log("timers.validate");
var validationTime = globalThis.config.modSettings.validationTime;

module.exports = {
	async run() {
		try {
			// Get all unverified mods
			var unverifiedMods = await DB.mods.data.findUnverified();
			if (unverifiedMods.length > 0) {
				logger.info(`Found ${unverifiedMods.length} unverified mod(s) to check.`);
				var now = new Date();

				for (var mod of unverifiedMods) {
					// Get the oldest version of the mod
					var modVersion = await DB.mods.versions.oldest(mod.modID);

					if (!modVersion) {
						//log.info(`No version found for modID: ${mod.modID}. Skipping...`);
						continue;
					}

					var uploadTime = new Date(modVersion.uploadTime);
					var elapsedTime = now - uploadTime;

					if (elapsedTime > validationTime) {
						// Update the mod to be verified
						mod.verified = true;
						await DB.mods.data.update(mod.modID, mod);

						// Log the action
						var action = {
							discordID: "Timer",
							action: `Auto-Verified mod ${mod.modID}`,
							time: new Date(),
							logged: false,
						};
						await DB.actions.add(action);
						//log.info(`ModID: ${mod.modID} verified successfully.`);
					} else {
						// log.info(`ModID: ${mod.modID} not yet eligible for verification. Validating at ${uploadTime + elapsedTime}`);
					}
				}
			}
		} catch (error) {
			logger.info(`Error verifying mods: ${error.message}`);
		}
	},
};
