/**
 * @file UpdateMods.js
 * @description A timer to make sure ModDB data is using the latest mod version data.
 */
var colors = require("colors");
var Utils = require('./../utils');
var log = new Utils.log.log(colors.green("Sandustry.Timer.ModData"), "./sandustry.Timer.main.txt", true);
var Mongo = require("./../Shared/DB");

/**
 * Namespace for Sandustry timer tasks.
 * @namespace UpdateMods
 * @memberof module:timers
 */
/**
 * Timer script to update modData.
 *
 * @async
 * @function run
 * @memberof module:timers.UpdateMods
 *
 * @returns {Promise<void>} Resolves when the timer task has completed processing.
 *
 * @throws {Error} Logs an error if any issues occur.
 *
 */
module.exports = {
    async run() {
        log.log("Updating mod data...");
        var page = 1;
        var MorePages = true;
        while (MorePages) {
            var Mods = await Mongo.GetMod.Data.Search("",false,false,{number:page,size:300})
            if(Mods.length == 0){
                MorePages = false;
            }else{
                log.log(`Found ${Mods.length} mods`);
                for (var mod of Mods) {
                    var modData = await Mongo.GetMod.Versions.One(mod.modID,"",{ modfile: 0 });
                    if(mod.modData.version == modData.modData.version){

                    }else{
                        log.log(`Updating mod ${mod.modID} to version ${modData.modData.version}`);
                        mod.modData.version = modData.modData.version;
                        await Mongo.GetMod.Data.Update(mod.modID,mod)
                    }
                }
                page++;
            }
        }
        log.log("Mod data updated.");
    }
};