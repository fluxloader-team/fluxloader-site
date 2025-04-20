/**
 * @file findmod.js
 * @description Handles APIs for searching and retrieving mod information, versions, and files.
 * This module provides endpoints to search for mods, download specific versions, and get mod-related metadata.
 */

var colors = require("colors");
var Utils = require("./../utils");
var { compress, decompress } = require("@mongodb-js/zstd");
var log = new Utils.log.log(colors.green("Sandustry.web.pages.search"), "./sandustry.web.main.txt", true);
var Mongo = require("./../Shared/DB");

/**
 * for mod search and retrieval functionality within the web module.
 * @namespace search
 * @memberof module:api
 */
module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:api.search
	 */
	paths: ["/api/mods"],
	/**
	 * Handles API requests for mod search and retrieval.
	 *
	 * Depending on the query parameters, the API provides different functionality:
	 * - Search for mods using keywords.
	 * - Fetch metadata of a specific mod (e.g., name, version, dependencies).
	 * - Download a specific version of a mod.
	 * - Retrieve a list of available versions for a mod.
	 *
	 * ### Query Parameters:
	 * - **search**: *(optional)*
	 *   Searches for mods that match a given keyword in their metadata.
	 *   - *Example*: `search=testmod`
	 *
	 * - **modid**: *(required for non-search options)*
	 *   The unique ID of the mod to retrieve information or download.
	 *   - *Example*: `modid=1234`
	 *
	 * - **option**: *(required for non-search options)*
	 *   Specifies the action to be performed. Supported values:
	 *   - `"info"`: Retrieves metadata of a specific mod.
	 *   - `"download"`: Downloads a mod version.
	 *   - `"versions"`: Fetches a list of available versions for the mod.
	 *   - *Example*: `option=info`
	 *
	 * - **version**: *(optional)*
	 *   The specific version of a mod to retrieve or download. If not provided, the latest version will be used.
	 *   - *Example*: `version=1.0.0`
	 *
	 * - **page**: *(optional, only for `search`)*
	 *   Specifies the page of results to return for the search query. Defaults to `1`.
	 *   - *Example*: `page=2`
	 *
	 * - **size**: *(optional, only for `search`)*
	 *   Specifies the number of results to return per page. Defaults to `10`.
	 *   - *Example*: `size=25`
	 *
	 * ### Behavior for Query Options:
	 * 1. `search`: Searches for mods by name or metadata using the `search` query. Supports pagination with `page` and `size`.
	 *    - Default behavior: Returns the first 10 results (`page=1`, `size=10`).
	 *    - Example query: `/api/mods?search=testmod&page=2&size=5`
	 * 2. `info`: Retrieves metadata for a mod ID, optionally filtered by version.
	 *    Requires `modid`, and optionally `version`.
	 * 3. `download`: Downloads a specific version of a mod.
	 *    Requires `modid`, and optionally `version`.
	 * 4. `versions`: Fetches a list of all available versions for the mod ID.
	 *    Requires `modid`.

	 * @async
	 * @function run
	 * @memberof module:api.search
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} - The response is sent directly to the client.
	 *
	 * @throws {Error} If query parameters are missing or other errors occur during processing.
	 *
	 * @example <caption>Example 1: Search for mods (first page, default size)</caption>
	 * // URL: /api/mods?search=testmod
	 * fetch('/api/mods?search=testmod')
	 *   .then(response => response.json())
	 *   .then(data => console.log(data));
	 *
	 * @example <caption>Example 2: Search for mods (second page, custom size)</caption>
	 * // URL: /api/mods?search=testmod&page=2&size=20
	 * fetch('/api/mods?search=testmod&page=2&size=20')
	 *   .then(response => response.json())
	 *   .then(data => console.log(data));
	 *
	 * @example <caption>Example 3: Fetch mod metadata (latest version)</caption>
	 * // URL: /api/mods?modid=1234&option=info
	 * fetch('/api/mods?modid=1234&option=info')
	 *   .then(response => response.json())
	 *   .then(data => console.log(data));
	 *
	 * @example <caption>Example 4: Fetch mod metadata (specific version)</caption>
	 * // URL: /api/mods?modid=1234&option=info&version=1.0.0
	 * fetch('/api/mods?modid=1234&option=info&version=1.0.0')
	 *   .then(response => response.json())
	 *   .then(data => console.log(data));
	 *
	 * @example <caption>Example 5: Download a mod version</caption>
	 * // URL: /api/mods?modid=1234&option=download&version=1.0.0
	 * fetch('/api/mods?modid=1234&option=download&version=1.0.0')
	 *   .then(response => response.blob())
	 *   .then(blob => {
	 *     const url = window.URL.createObjectURL(blob);
	 *     const a = document.createElement('a');
	 *     a.style.display = 'none';
	 *     a.href = url;
	 *     a.download = 'mod-1.0.0.zip';
	 *     document.body.appendChild(a);
	 *     a.click();
	 *     window.URL.revokeObjectURL(url);
	 *   });
	 *
	 * @example <caption>Example 6: Fetch all available versions of a mod</caption>
	 * // URL: /api/mods?modid=1234&option=versions
	 * fetch('/api/mods?modid=1234&option=versions')
	 *   .then(response => response.json())
	 *   .then(data => console.log(data));
	 */
	run: async function (req, res) {
		try {
			var queryurl = req.url.split("?")[1];
			var query = queryurl.split("&");
			var querys = {};
			query.forEach(function (urlvar) {
				var varsplit = urlvar.split("=");
				querys[varsplit[0]] = varsplit[1];
			});
			if (querys["search"] == undefined && (querys["modid"] == undefined || querys["option"] == undefined)) {
				res.writeHead(201, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						error: "Missing required query parameters",
						missing: {
							modid: querys["modid"] === undefined,
							option: querys["option"] === undefined,
						},
					})
				);
				return;
			}
			if (querys["search"] == undefined) {
				switch (querys["option"]) {
					case "download":
						try {
							var modID = querys["modid"];
							if (!modID) {
								res.writeHead(201, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "ModID is required to download the mod.",
									})
								);
								return;
							}
							var modData = {}
							if(querys["version"]){
								modData = Mongo.GetMod.Versions.One(modID,querys["version"]);
							}else{
								modData = Mongo.GetMod.Versions.One(modID);
							}
							if (!modData) {
								res.writeHead(201, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "No mod version found for the specified mod ID and version.",
										modID,
										version: querys["version"] || "latest",
									})
								);
								return;
							}
							var compressedBuffer = Buffer.from(modData.modfile, "base64");
							var decompressedBuffer = await decompress(compressedBuffer);
							res.writeHead(200, {
								"Content-Type": "application/zip",
								"Content-Disposition": `attachment; filename=${modData.modData.name}.zip`,
							});
							res.end(decompressedBuffer);
						} catch (error) {
							log.log("Error processing mod download: " + error.message);
							res.writeHead(201, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: "An error occurred while processing the download.",
									details: error.message,
								})
							);
						}

						break;
					case "info":
						try {
							var modID = querys["modid"];
							if (!modID) {
								res.writeHead(201, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "ModID is required to fetch the mod information.",
									})
								);
								return;
							}
							var modVersion = {}
							if(querys["version"]){
								modVersion = await Mongo.GetMod.Versions.One(modID,querys["version"],{ modfile: 0 });
							}else{
								modVersion = await Mongo.GetMod.Versions.One(modID,"",{ modfile: 0 });
							}

							if (!modVersion) {
								res.writeHead(201, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										message: "No mod version found for the specified mod ID and version.",
										modID,
										version: querys["version"] || "latest",
									})
								);
								return;
							}

							res.writeHead(201, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ mod: modVersion }));
						} catch (err) {
							log.log("Error fetching mod info: " + err.message);
							res.writeHead(201, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: "An internal server error occurred while fetching mod information.",
									details: err.message,
								})
							);
						}

						break;
					case "versions":
						try {
							var modID = querys["modid"];
							if (!modID) {
								res.writeHead(201, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "ModID is required to fetch versions.",
									})
								);
								return;
							}

							var versions = await Mongo.GetMod.Versions.Numbers(modID);

							if (versions.length === 0) {
								res.writeHead(201, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										message: "No versions found for the specified mod ID.",
										modID: modID,
									})
								);
								return;
							}

							res.writeHead(201, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ versions }));
						} catch (err) {
							log.log("Error fetching versions: " + err.message);
							res.writeHead(201, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: "An internal server error occurred while fetching versions.",
									details: err.message,
								})
							);
						}
						break;
					default:
				}
			} else {
				try {
					var searchQuery = decodeURIComponent(querys["search"]);
					var mods = []
					var VerifiedOnly = true;
					if(querys["verified"]){
						if(querys["verified"] == "true"){

						}else if (querys["verified"] == "false"){
							VerifiedOnly = false
						}else{
							VerifiedOnly = null;
						}
					}
					if(querys["page"]){
						var page = {number:parseInt(querys["page"]),size:200}
						if(querys["size"]){
							page.size = parseInt(querys["size"])
						}
						mods =  await Mongo.GetMod.Data.Search(searchQuery,VerifiedOnly,false,page);
					}else{
						mods = await Mongo.GetMod.Data.Search(searchQuery,VerifiedOnly,false);
					}

					if (mods.length === 0) {
						res.writeHead(201, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								message: "No mods found matching your search query.",
								searchQuery,
							})
						);
						return;
					}

					res.writeHead(201, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							message: "Search results successfully fetched",
							resultsCount: mods.length,
							mods,
						})
					);
				} catch (error) {
					log.log("Error occurred while searching mods:", error);

					res.writeHead(201, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							error: "An error occurred while processing your search.",
							details: error.message,
						})
					);
				}
			}
		} catch (error) {
			var allMods = await Mongo.GetMod.Data.Search("",true,false);

			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify(allMods));
		}
	},
};
