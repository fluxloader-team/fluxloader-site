/**
 * @file findmod.js
 * @description Handles APIs for searching and retrieving mod information, versions, and files.
 * This module provides RESTful endpoints to search the mod database, download specific versions, and retrieve mod metadata.
 * It serves as the primary interface between the frontend and the mod database.
 */

var colors = require("colors");
var Utils = require("./../utils");
var { compress, decompress } = require("@mongodb-js/zstd");
var log = new Utils.log.log(colors.green("Sandustry.web.pages.search"), "./sandustry.web.main.txt", true);
var Mongo = require("./../Shared/DB");

/**
 * Namespace for mod search and retrieval functionality within the web module.
 * This provides the API endpoints that power the mod browser interface.
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
	 *   Searches for mods using a MongoDB query provided as a JSON string.
	 *   Must be a valid JSON string that is URL-encoded.
	 *   - *Example*: `search=%7B%22modData.name%22%3A%7B%22%24regex%22%3A%22test%22%2C%22%24options%22%3A%22i%22%7D%7D`
	 *   - This example decodes to: `{"modData.name":{"$regex":"test","$options":"i"}}`
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
	 * 1. `search`: Performs MongoDB queries on mod data using a JSON query string provided in the `search` parameter. 
	 *    Supports pagination with `page` and `size`. The search parameter should be a URL-encoded JSON string.
	 *    - Default behavior: Returns the first 200 results (`page=1`, `size=200`).
	 *    - Example query: `/api/mods?search=%7B%22modData.name%22%3A%7B%22%24regex%22%3A%22test%22%2C%22%24options%22%3A%22i%22%7D%7D&page=2&size=20`
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
	          * Additional query parameters for search:
	          * - **verified**: *(optional, only for `search`)*
	          *   Filters mods by verification status:
	          *   - `"true"`: Return only verified mods
	          *   - `"false"`: Return only unverified mods
	          *   - `"null"` or omitted: Return all mods regardless of verification status
	          *   - *Example*: `verified=true`
	 *
	 * @example <caption>Example 1: Search for mods using a JSON query (exact field match)</caption>
	 * // URL: /api/mods?search=%7B%22modData.modID%22%3A%22example-mod%22%7D
	 * // Decoded query: {"modData.modID":"example-mod"}
	 * 
	 * async function searchExactMatch() {
	 *   try {
	 *     const searchQuery = encodeURIComponent(JSON.stringify({ "modData.modID": "example-mod" }));
	 *     const response = await fetch(`/api/mods?search=${searchQuery}&page=1&size=20`);
	 *     const data = await response.json();
	 *     console.log(data);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error fetching data:", error);
	 *   }
	 * }
	 *
	 * @example <caption>Example 2: Search for mods using regex pattern</caption>
	 * // Using case-insensitive regex to find mods containing specific text
	 * async function searchWithRegex() {
	 *   try {
	 *     const searchQuery = encodeURIComponent(JSON.stringify({
	 *       "modData.modID": { $regex: "mod id here", $options: 'i'}
	 *     }));
	 *     const url = `https://fluxloader.app/api/mods?search=${searchQuery}&page=1&size=5000`;
	 *     const response = await fetch(url);
	 *     const data = await response.json();
	 *     console.log(data);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error searching with regex:", error);
	 *   }
	 * }
	 *
	 * @example <caption>Example 3: Complex query with multiple conditions</caption>
	 * // Search for mods by a specific author that contain a certain tag
	 * async function searchWithComplexQuery() {
	 *   try {
	 *     const query = {
	 *       $and: [
	 *         { "modData.author": "AuthorName" },
	 *         { "modData.tags": { $in: ["gameplay"] } }
	 *       ]
	 *     };
	 *     const searchQuery = encodeURIComponent(JSON.stringify(query));
	 *     const response = await fetch(`/api/mods?search=${searchQuery}&page=1&size=20`);
	 *     const data = await response.json();
	 *     console.log(data);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error with complex query:", error);
	 *   }
	 * }
	 * @example <caption>Example 4: Error handling for search queries</caption>
	 * // Always add error handling for search API calls
	 * async function searchWithErrorHandling() {
	 *   try {
	 *     const searchQuery = encodeURIComponent(JSON.stringify({
	 *       "modData.name": { $regex: "test", $options: "i" }
	 *     }));
	 *     const response = await fetch(`/api/mods?search=${searchQuery}`);
	 *     const data = await response.json();
	 *
	 *     if (data.error) {
	 *       console.error("Search error:", data.error);
	 *       // Handle the error appropriately
	 *     } else {
	 *       console.log("Search results:", data.mods);
	 *       return data.mods;
	 *     }
	 *   } catch (err) {
	 *     console.error("Network error:", err);
	 *   }
	 * }
	 *
	 * @example <caption>Example 5: Fetch mod metadata (latest version)</caption>
	 * // URL: /api/mods?modid=1234&option=info
	 * async function fetchModMetadata(modId) {
	 *   try {
	 *     const response = await fetch(`/api/mods?modid=${modId}&option=info`);
	 *     const data = await response.json();
	 *     console.log(data);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error fetching metadata:", error);
	 *   }
	 * }
	 *
	 * @example <caption>Example 6: Fetch mod metadata (specific version)</caption>
	 * // URL: /api/mods?modid=1234&option=info&version=1.0.0
	 * async function fetchSpecificModVersion(modId, version) {
	 *   try {
	 *     const response = await fetch(`/api/mods?modid=${modId}&option=info&version=${version}`);
	 *     const data = await response.json();
	 *     console.log(data);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error fetching specific version:", error);
	 *   }
	 * }
	 *
	 * @example <caption>Example 7: Download a mod version</caption>
	 * // URL: /api/mods?modid=1234&option=download&version=1.0.0
	 * async function downloadModVersion(modId, version) {
	 *   try {
	 *     const response = await fetch(`/api/mods?modid=${modId}&option=download&version=${version}`);
	 *     const blob = await response.blob();
	 *
	 *     const url = window.URL.createObjectURL(blob);
	 *     const a = document.createElement('a');
	 *     a.style.display = 'none';
	 *     a.href = url;
	 *     a.download = `mod-${version}.zip`;
	 *     document.body.appendChild(a);
	 *     a.click();
	 *     window.URL.revokeObjectURL(url);
	 *     document.body.removeChild(a);
	 *   } catch (error) {
	 *     console.error("Error downloading mod:", error);
	 *   }
	 * }
	 *
	 * @example <caption>Example 8: Fetch all available versions of a mod</caption>
	 * // URL: /api/mods?modid=1234&option=versions
	 * async function fetchAllModVersions(modId) {
	 *   try {
	 *     const response = await fetch(`/api/mods?modid=${modId}&option=versions`);
	 *     const data = await response.json();
	 *     console.log(data);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error fetching versions:", error);
	 *   }
	 * }
	 * 
	 * @example <caption>Example 9: Batch search for multiple specific mod IDs</caption>
	 * // Search for several mods by their IDs in a single query
	 * async function batchSearchByModIds(modIds) {
	 *   try {
	 *     // Create a MongoDB query using $in operator to match any of the provided IDs
	 *     const query = {
	 *       "modID": { 
	 *         "$in": modIds  // Array of mod IDs to search for
	 *       }
	 *     };
	 *     
	 *     const searchQuery = encodeURIComponent(JSON.stringify(query));
	 *     const response = await fetch(`/api/mods?search=${searchQuery}&size=100`);
	 *     const data = await response.json();
	 *     
	 *     if (data.error) {
	 *       console.error("Batch search error:", data.error);
	 *       return null;
	 *     }
	 *     
	 *     // Create a map of found mods indexed by modID for easy lookup
	 *     const modsMap = {};
	 *     data.mods.forEach(mod => {
	 *       modsMap[mod.modID] = mod;
	 *     });
	 *     
	 *     // Check which mod IDs were not found
	 *     const notFoundIds = modIds.filter(id => !modsMap[id]);
	 *     if (notFoundIds.length > 0) {
	 *       console.warn("Some mod IDs were not found:", notFoundIds);
	 *     }
	 *     
	 *     console.log(`Found ${data.mods.length} of ${modIds.length} requested mods`);
	 *     return {
	 *       found: data.mods,
	 *       foundMap: modsMap,
	 *       notFound: notFoundIds
	 *     };
	 *   } catch (error) {
	 *     console.error("Error in batch mod search:", error);
	 *     return null;
	 *   }
	 * }
	 * 
	 * // Example usage:
	 * // const result = await batchSearchByModIds(['mod-123', 'mod-456', 'mod-789']);
	 * // Access specific mod: result.foundMap['mod-123']
	 * 
	 * @example <caption>Example 10: Search for mods containing multiple specific tags</caption>
	 * // Search for mods that have ALL of the specified tags
	 * async function searchModsByMultipleTags(requiredTags) {
	 *   try {
	 *     // The $all operator ensures that the mod has all the specified tags
	 *     // This finds mods where modData.tags array contains all elements in requiredTags
	 *     const query = {
	 *       "modData.tags": { 
	 *         "$all": requiredTags  // Array of required tags - mod must have ALL of these
	 *       }
	 *     };
	 *     
	 *     const searchQuery = encodeURIComponent(JSON.stringify(query));
	 *     const response = await fetch(`/api/mods?search=${searchQuery}`);
	 *     const data = await response.json();
	 *     
	 *     if (data.error) {
	 *       console.error("Tags search error:", data.error);
	 *       return null;
	 *     }
	 *     
	 *     console.log(`Found ${data.mods.length} mods containing all tags: ${requiredTags.join(', ')}`);
	 *     
	 *     return {
	 *       mods: data.mods,
	 *       count: data.mods.length,
	 *       tags: requiredTags
	 *     };
	 *   } catch (error) {
	 *     console.error("Error in multi-tag search:", error);
	 *     return null;
	 *   }
	 * }
	 * 
	 * // Example usage:
	 * // Search for mods with both "gameplay" and "multiplayer" tags
	 * // const gameMods = await searchModsByMultipleTags(['gameplay', 'multiplayer']);
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
					var parsedQuery;
					try {
						parsedQuery = JSON.parse(searchQuery);
						// Validate it's an array or object
						if (!parsedQuery || (typeof parsedQuery !== 'object')) {
							throw new Error("Invalid search query format");
						}
					} catch (jsonError) {
						log.log("Invalid JSON search query: " + jsonError.message);
						res.writeHead(201, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								error: "Invalid search query format. Please provide a valid JSON query.",
								details: jsonError.message
							})
						);
						return;
					}

					var mods = []
					var VerifiedOnly = true;
					if(querys["verified"]){
						if(querys["verified"] == "true"){
							// Keep default true value
						}else if (querys["verified"] == "false"){
							VerifiedOnly = false
						}else{
							VerifiedOnly = null;
						}
					}
					// Default to an empty array for search if nothing is provided
					if (!searchQuery || searchQuery.trim() === "") {
						searchQuery = "[]";
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
