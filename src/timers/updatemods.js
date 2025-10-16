const Utils = require("../common/utils.js");
const DB = require("../common/db");

const logger = new Utils.Log("timers.moddata");

module.exports = {
	async run() {
		let page = 1;
		while (true) {
			const query = JSON.stringify({ "modData.name": { $regex: "", $options: "i" } });
			let mods = await DB.mods.data.search(query, null, false, { number: page, size: 100 }, { _id: 1, modID: 1, modData: 1 });
			if (!mods || mods.length === 0) break;

			let updatedMods = 0;
			let modIDs = mods.map((mod) => mod.modID);
			let modDataList = await DB.mods.versions.multiple(modIDs);
			let modDataMap = Object.fromEntries(modDataList.map((mod) => [mod.modID, mod.modData]));

			for (let mod of mods) {
				let modData = modDataMap[mod.modID];

				if (!modData || !modData.version) {
					logger.error(`No mod version found in modData: ${modData}`);
					continue;
				}
				if (!mod.modData || !mod.modData.version) {
					logger.error(`No mod version found in mod.modData: ${mod.modData}`);
					continue;
				}

				if (mod.modData.version !== modData.version) {
					mod.modData.version = modData.version;
					await DB.mods.data.update(mod.modID, mod);
					let action = {
						discordID: "Timer",
						action: `Updated mod ${mod.modID} to version ${modData.version}`,
						time: new Date(),
					};
					updatedMods++;
					await DB.actions.add(action);
				}

				modData = null;
				mod = null;
			}

			if (updatedMods > 0) {
				logger.info(`Updated ${updatedMods} mods on page ${page}`);
			}

			modDataMap = null;
			modDataList = null;
			mods = null;
			modIDs = null;
			page++;
		}
	},
};
