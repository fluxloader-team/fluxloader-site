const Utils = require("../../../common/utils.js");
const DB = require("../../../common/db");

const logger = new Utils.Log("pages.search");

module.exports = {
	paths: ["/api/mods"],
	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: async function (req, res) {
		try {
			// Extract query parameters from the request URL
			var queryurl = req.url.split("?")[1];
			var query = queryurl.split("&");
			var querys = {};
			query.forEach(function (urlvar) {
				var varsplit = urlvar.split("=");
				querys[varsplit[0]] = varsplit[1];
			});

			// Check that atleast one of the endpoints will be used
			if (querys["search"] == undefined && ((querys["modid"] == undefined && querys["modids"] == undefined) || querys["option"] == undefined)) {
				res.writeHead(400, { "Content-Type": "application/json" });
				res.end(
					JSON.stringify({
						error: "Missing required query parameters",
						missing: {
							modid: querys["modid"] === undefined,
							modids: querys["modids"] === undefined,
							option: querys["option"] === undefined,
						},
					})
				);
				return;
			}

			// /api/mods
			if (querys["search"] == undefined) {
				switch (querys["option"]) {
					// /api/mods?option=download
					case "download":
						try {
							var modID = querys["modid"];
							if (!modID) {
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "ModID is required to download the mod.",
									})
								);
								return;
							}
							logger.info(`Attempting to retrieve mod data for modID: ${modID}, version: ${querys["version"] || "latest"}`);
							var modData = {};
							if (querys["version"]) {
								modData = await DB.mods.versions.one(modID, querys["version"]);
							} else {
								modData = await DB.mods.versions.one(modID);
							}
							logger.info(
								`Retrieved modData: ${JSON.stringify({
									modID: modID,
									version: querys["version"] || "latest",
									hasModData: !!modData,
									hasModfile: modData && !!modData.modfile,
									modDataKeys: modData ? Object.keys(modData) : [],
								})}`
							);
							if (!modData) {
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "No mod version found for the specified mod ID and version.",
										modID,
										version: querys["version"] || "latest",
									})
								);
								return;
							}
							if (!modData.modfile) {
								logger.info(`Mod file data is missing for modID: ${modID}, version: ${querys["version"] || "latest"}`);
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "Mod file data is missing for the specified mod version.",
										modID,
										version: querys["version"] || "latest",
									})
								);
								return;
							}
							logger.info(`Processing download for modID: ${modID}, version: ${querys["version"] || "latest"}, modfile length: ${modData.modfile ? modData.modfile.length : 0}`);
							var zipBuffer = Buffer.from(modData.modfile, "base64");
							res.writeHead(200, {
								"Content-Type": "application/zip",
								"Content-Disposition": `attachment; filename=${modData.modID}.zip`,
							});
							res.end(zipBuffer);
						} catch (error) {
							logger.info(`Error processing mod download: ${error.message}`);
							logger.info(`Error stack: ${error.stack}`);
							logger.info(
								`Error context: modID=${modID}, version=${querys["version"] || "latest"}, modData=${JSON.stringify({
									exists: !!modData,
									hasModfile: modData && !!modData.modfile,
									modfileLength: modData && modData.modfile ? modData.modfile.length : 0,
									modDataKeys: modData ? Object.keys(modData) : [],
								})}`
							);

							res.writeHead(500, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: "An error occurred while processing the download.",
									details: error.message,
									modID: modID,
									version: querys["version"] || "latest",
								})
							);
						}

						break;

					// /api/mods?option=info
					case "info":
						try {
							var modID = querys["modid"];
							if (!modID) {
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "ModID is required to fetch the mod information.",
									})
								);
								return;
							}
							logger.info(`Attempting to retrieve mod info for modID: ${modID}, version: ${querys["version"] || "latest"}`);
							var modVersion = {};
							if (querys["version"]) {
								modVersion = await DB.mods.versions.one(modID, querys["version"], { modfile: 0 });
							} else {
								modVersion = await DB.mods.versions.one(modID, "", { modfile: 0 });
							}
							logger.info(
								`Retrieved modVersion: ${JSON.stringify({
									modID: modID,
									version: querys["version"] || "latest",
									hasModVersion: !!modVersion,
									modVersionKeys: modVersion ? Object.keys(modVersion) : [],
								})}`
							);

							if (!modVersion) {
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										message: "No mod version found for the specified mod ID and version.",
										modID,
										version: querys["version"] || "latest",
									})
								);
								return;
							}

							res.writeHead(200, { "Content-Type": "application/json" });
							res.end(JSON.stringify({ mod: modVersion }));
						} catch (err) {
							logger.info(`Error fetching mod info: ${err.message}`);
							logger.info(`Error stack: ${err.stack}`);
							logger.info(
								`Error context: modID=${modID}, version=${querys["version"] || "latest"}, modVersion=${JSON.stringify({
									exists: !!modVersion,
									modVersionKeys: modVersion ? Object.keys(modVersion) : [],
								})}`
							);

							res.writeHead(500, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: "An internal server error occurred while fetching mod information.",
									details: err.message,
									modID: modID,
									version: querys["version"] || "latest",
								})
							);
						}

						break;

					// /api/mods?option=versions
					case "versions":
						try {
							var modID = querys["modid"];
							var modIDs = querys["modids"];

							logger.info(
								`Attempting to retrieve versions with parameters: ${JSON.stringify({
									modID: modID || null,
									modIDs: modIDs || null,
									data: querys["data"] || false,
								})}`
							);

							// Check if modids parameter is provided (for multiple mod IDs)
							if (modIDs) {
								// Parse the comma-separated list of mod IDs
								var modIDsArray = modIDs.split(",");
								logger.info(`Processing versions request for multiple modIDs: ${modIDsArray.join(", ")}`);

								// Check if full version data is requested
								if (querys["data"] === "true") {
									// This feature is not implemented for multiple mod IDs
									res.writeHead(501, { "Content-Type": "application/json" });
									res.end(
										JSON.stringify({
											error: "Full version data is not supported for multiple mod IDs. Use single modid parameter for full data.",
										})
									);
									return;
								}

								// Get version numbers for multiple mod IDs
								var versionsMap = await DB.mods.versions.multipleNumbers(modIDsArray);

								logger.info(
									`Retrieved versions for multiple modIDs: ${JSON.stringify({
										requestedCount: modIDsArray.length,
										returnedCount: Object.keys(versionsMap).length,
										missingModIDs: modIDsArray.filter((id) => !versionsMap[id] || versionsMap[id].length === 0),
									})}`
								);

								res.writeHead(200, { "Content-Type": "application/json" });
								res.end(JSON.stringify({ versions: versionsMap }));
							}
							// Handle single mod ID case (original behavior)
							else if (modID) {
								logger.info(`Processing versions request for single modID: ${modID}`);
								// Check if full version data is requested
								if (querys["data"] === "true") {
									// Get all version data (excluding the modfile to reduce payload size)
									var versionsData = await DB.mods.versions.all(modID, { modfile: 0 });

									logger.info(
										`Retrieved full version data for modID ${modID}: ${JSON.stringify({
											count: versionsData.length,
											versions: versionsData.length > 0 ? versionsData.map((v) => v.version) : [],
										})}`
									);

									if (versionsData.length === 0) {
										res.writeHead(400, { "Content-Type": "application/json" });
										res.end(
											JSON.stringify({
												message: "No versions found for the specified mod ID.",
												modID: modID,
											})
										);
										return;
									}

									res.writeHead(200, { "Content-Type": "application/json" });
									res.end(JSON.stringify({ versions: versionsData }));
								}

								// Get only version numbers (origina#l behavior)
								else {
									var versions = await DB.mods.versions.numbers(modID);

									logger.info(
										`Retrieved version numbers for modID ${modID}: ${JSON.stringify({
											count: versions.length,
											versions: versions,
										})}`
									);

									if (versions.length === 0) {
										res.writeHead(400, { "Content-Type": "application/json" });
										res.end(
											JSON.stringify({
												message: "No versions found for the specified mod ID.",
												modID: modID,
											})
										);
										return;
									}

									res.writeHead(200, { "Content-Type": "application/json" });
									res.end(JSON.stringify({ versions }));
								}
							} else {
								// Neither modid nor modids parameter was provided
								res.writeHead(400, { "Content-Type": "application/json" });
								res.end(
									JSON.stringify({
										error: "Either modid or modids parameter is required to fetch versions.",
									})
								);
								return;
							}
						} catch (err) {
							logger.info(`Error fetching versions: ${err.message}`);
							logger.info(`Error stack: ${err.stack}`);
							logger.info(
								`Error context: ${JSON.stringify({
									modID: modID || null,
									modIDs: modIDs || null,
									modIDsArray: modIDs ? modIDsArray : null,
									dataRequested: querys["data"] === "true",
								})}`
							);

							res.writeHead(400, { "Content-Type": "application/json" });
							res.end(
								JSON.stringify({
									error: "An internal server error occurred while fetching versions.",
									details: err.message,
									modID: modID || null,
									modIDs: modIDs ? modIDsArray : null,
								})
							);
						}
						break;
					default:
				}
			}

			// /api/mods?search
			else {
				try {
					// Parse search query from the URL-encoded JSON string
					var searchQuery = decodeURIComponent(querys["search"]);
					var parsedQuery;
					try {
						parsedQuery = JSON.parse(searchQuery);
						if (!parsedQuery || typeof parsedQuery !== "object") {
							throw new Error("Invalid search query format");
						}
					} catch (jsonError) {
						logger.info("Invalid JSON search query: " + jsonError.message);
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								error: "Invalid search query format. Please provide a valid JSON query.",
								details: jsonError.message,
							})
						);
						return;
					}

					var mods = [];
					var VerifiedOnly = true;
					if (querys["verified"]) {
						if (querys["verified"] == "true") {
						} else if (querys["verified"] == "false") {
							VerifiedOnly = false;
						} else {
							VerifiedOnly = null;
						}
					}
					if (!searchQuery || searchQuery.trim() === "") {
						searchQuery = "[]";
					}

					if (querys["page"]) {
						var page = { number: parseInt(querys["page"]), size: 200 };
						if (querys["size"]) {
							page.size = parseInt(querys["size"]);
						}
						mods = await DB.mods.data.search(searchQuery, VerifiedOnly, false, page);
					} else {
						mods = await DB.mods.data.search(searchQuery, VerifiedOnly, false);
					}

					if (mods.length === 0) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(
							JSON.stringify({
								message: "No mods found matching your search query.",
								searchQuery,
							})
						);
						return;
					}

					res.writeHead(200, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							message: "Search results successfully fetched",
							resultsCount: mods.length,
							mods,
						})
					);
				} catch (error) {
					logger.info("Error occurred while searching mods:" + error);

					res.writeHead(500, { "Content-Type": "application/json" });
					res.end(
						JSON.stringify({
							error: "An error occurred while processing your search.",
							details: error.message,
						})
					);
				}
			}
		} catch (error) {
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Missing required query parameters" }));
		}
	},
};
