const Utils = require("../common/utils.js");
const DB = require("../common/db");

const logger = new Utils.Log("sandustry.timer.moddata", "./sandustry.timer.main.txt", true);

module.exports = {
	async run() {
		logger.info("Updating mod data...");
		var page = 1;
		var MorePages = true;
		while (MorePages) {
			var Mods = await DB.getMod.Data.Search(JSON.stringify({ "modData.name": { $regex: "", $options: "i" } }), null, false, { number: page, size: 100 }, { _id: 1, modID: 1, modData: 1 });
			if (!Mods || Mods.length === 0) {
				MorePages = false;
			} else {
				//log.info(`Found ${Mods.length} mods`);
				var modIDs = Mods.map((mod) => mod.modID);
				var modDataList = await DB.getMod.versions.Multiple(modIDs);
				var modDataMap = Object.fromEntries(modDataList.map((mod) => [mod.modID, mod.modData]));
				//log.info(`${JSON.stringify(modDataMap)}`)
				for (var mod of Mods) {
					var modData = modDataMap[mod.modID];
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
						await DB.getMod.Data.Update(mod.modID, mod);

						var action = {
							discordID: "Timer",
							action: `Updated mod ${mod.modID} to version ${modData.version}`,
							time: new Date(),
						};
						await DB.GetAction.Add(action);
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

		logger.info("Mod data updated.");
	},
};
