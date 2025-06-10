var { MongoClient } = require("mongodb");
var Utils = require("../utils");
const crypto = require("crypto");
const https = require("https");
const { compress } = require("@mongodb-js/zstd");
var JSZip = require("jszip");
const sanitizeHTML = require("sanitize-html");

var log = new Utils.Log("sandustry.shared.DB", "./sandustry.shared.txt", true);
var mongoUri = globalThis.config.mongodb.uri;

/**
 * Represents an entry for a mod in the mod db.
 * @class
 * @memberof module:DB
 */
class ModEntry {
	/**
	 * The unique identifier of the mod.
	 * @type {string}
	 */
	modID = "";

	/**
	 * The data associated with the mod.
	 * @type {Object}
	 * @property {string} modID - The ID of the mod.
	 * @property {string} name - The name of the mod.
	 * @property {string} version - The version of the mod.
	 * @property {string} author - The author of the mod.
	 * @property {string} fluxloaderVersion - The required version of the fluxloader.
	 * @property {string} shortDescription - A short description of the mod.
	 * @property {string} description - The full description of the mod.
	 * @property {Object} dependencies - Dependencies required by the mod.
	 * @property {string[]} tags - Tags or categories assigned to the mod.
	 * @property {string} electronEntrypoint - The entry point for the Electron app.
	 * @property {string} gameEntrypoint - The entry point for the Game app.
	 * @property {string} workerEntrypoint - The entry point for the Worker process.
	 * @property {string} scriptPath - The path to the mod's script file.
	 * @property {Object} configSchema - The configuration schema for the mod.
	 */
	modData = {
		modID: "",
		name: "",
		version: "",
		author: "",
		fluxloaderVersion: "",
		shortDescription: "",
		description: "",
		dependencies: {},
		tags: [],
		electronEntrypoint: "",
		gameEntrypoint: "",
		workerEntrypoint: "",
		scriptPath: "",
		configSchema: {},
	};

	/**
	 * Information about the mod's author.
	 * @type {Object}
	 * @property {string} discordID - The discord ID of the author.
	 * @property {string} discordUsername - The discord username of the author.
	 */
	Author = {
		discordID: "",
		discordUsername: "",
	};

	/**
	 * The date and time when the mod was uploaded.
	 * @type {Date}
	 */
	uploadTime = new Date();

	/**
	 * The number of votes that the mod has received.
	 * @type {number}
	 */
	votes = 0;

	/**
	 * Whether the mod is verified.
	 * @type {boolean}
	 */
	verified = false;
}

/**
 * Represents an entry for a mod version within the DB.
 * @class
 * @memberof module:DB
 */
class ModVersionEntry {
	/**
	 * The ID of the mod.
	 * @type {string}
	 */
	modID = "";
	/**
	 * The Zip of the mod compressed with zstd.
	 * @type {string}
	 */
	modfile = "";
	/**
	 * The data associated with the mod.
	 * @type {Object}
	 * @property {string} modID - The ID of the mod.
	 * @property {string} name - The name of the mod.
	 * @property {string} version - The version of the mod.
	 * @property {string} author - The author of the mod.
	 * @property {string} fluxloaderVersion - The required version of the fluxloader.
	 * @property {string} shortDescription - A short description of the mod.
	 * @property {string} description - The full description of the mod.
	 * @property {Object} dependencies - Dependencies required by the mod.
	 * @property {string[]} tags - Tags or categories assigned to the mod.
	 * @property {string} electronEntrypoint - The entry point for the Electron app.
	 * @property {string} gameEntrypoint - The entry point for the Game app.
	 * @property {string} workerEntrypoint - The entry point for the Worker process.
	 * @property {string} scriptPath - The path to the mod's script file.
	 * @property {Object} configSchema - The configuration schema for the mod.
	 */
	modData = {
		modID: "",
		name: "",
		version: "",
		author: "",
		fluxloaderVersion: "",
		shortDescription: "",
		description: "",
		dependencies: {},
		tags: [],
		electronEntrypoint: "",
		gameEntrypoint: "",
		workerEntrypoint: "",
		scriptPath: "",
		configSchema: {},
	};
	/**
	 * The upload time of the mod version.
	 * @type {Date}
	 */
	uploadTime = new Date();
	/**
	 * The number of downloads for the mod version.
	 * @type {number}
	 */
	downloadCount = 0;
}

/**
 * Represents a user entry in the database.
 *
 * This class is used to define the structure of user data stored in the `Users` collection.
 *
 * @class
 */
class UserEntry {
	/**
	 * The discord ID of the user (unique identifier).
	 * @type {string}
	 */
	discordID = "";

	/**
	 * The discord username of the user.
	 * @type {string}
	 */
	discordUsername = "";

	/**
	 * An array of permissions assigned to the user.
	 * @type {string[]}
	 */
	permissions = [""];

	/**
	 * A description or bio for the user.
	 * @type {string}
	 */
	description = "";

	/**
	 * The date and time when the user joined. Defaults to the current date and time.
	 * @type {Date}
	 */
	joinedAt = new Date();
	/**
	 * if the user is banned
	 * @type {boolean}
	 */
	banned = false;
}

/**
 * Represents an action entry in the database for logging user actions.
 *
 * This class defines the structure of action log entries stored in the `Actions` collection.
 *
 * @class
 * @memberof module:DB
 */
class ActionEntry {
	/**
	 * The discord ID of the user who performed the action.
	 * @type {string}
	 */
	discordID = "";

	/**
	 * Description of the action performed.
	 * @type {string}
	 */
	action = "";

	/**
	 * The date and time when the action occurred. Defaults to the current date and time.
	 * @type {Date}
	 */
	time = new Date();

	/**
	 * Indicates whether the action has been logged or processed.
	 * @type {boolean}
	 */
	logged = false;
}

/**
 * Handles operations using a MongoDB client.
 * @async
 * @function
 * @param {function(MongoClient): Promise<any>} [runClient] - Async function to run with the connected client.
 * @returns {Promise<any>} The result of the operation.
 */
async function handleClient(runClient = async function (client = new MongoClient(mongoUri)) {}) {
	var client = new MongoClient(mongoUri);
	var result = null;
	try {
		await client.connect();
		result = await runClient(client);
		await client.close();
		return result;
	} catch (err) {
		log.info(`${err}`);
	} finally {
		//await client.close();
	}
}

/**
 * all global db functions
 * @module DB
 */

/**
 * Functions related to mods.
 * @namespace GetMod
 * @memberof module:DB
 */
var GetMod = {
	/**
	 * Functions related to Mod versions.
	 * @namespace Versions
	 * @memberof module:DB.GetMod
	 */
	Versions: {
		/**
		 * Retrieves all versions of a mod.
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Versions
		 * @param {string} [modID] - The ID of the mod.
		 * @param {object} [project] - filter out data
		 * @param {object} [sort] - how to sort the data
		 * @returns {Promise<ModVersionEntry[]>} An array of all versions of the mod.
		 */
		All: async function (modID = "", project = {}, sort = { uploadTime: -1 }) {
			var endresult = await handleClient(async (client) => {
				var db = await client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var restult = await modVersionsCollection.find({ modID: modID }).sort(sort).project(project);
				return restult.toArray();
			});
			return endresult;
		},

		/**
		 * Retrieves the oldest version of a mod.
		 *
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Versions
		 * @param {string} [modID] - The ID of the mod.
		 * @param {object} [project] - Fields to include in the results
		 * @returns {Promise<ModVersionEntry|null>} The oldest version of the mod, or null if not found
		 */
		Oldest: async function (modID = "", project = {}) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modVersionsCollection = db.collection("ModVersions");
				var result = await modVersionsCollection.findOne(
					{ modID: modID },
					{
						sort: { uploadTime: 1 },
						projection: project,
					}
				);
				return result;
			});
			return endresult;
		},

		/**
		 * Retrieves the data of a specific mod version.
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Versions
		 * @param {string} [modID] - The ID of the mod.
		 * @param {string} [version] - The version of the mod to retrieve.
		 * @param {object} [project] - filter out data
		 * @param {object} [sort] - how to sort the data
		 * @returns {Promise<ModVersionEntry>} The mod version data, or `null` if not found.
		 */
		One: async function (modID = "", version = "", project = {}, sort = { uploadTime: -1 }) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modVersionsCollection = db.collection("ModVersions");
				var result = {};
				if (version === "") {
					result = modVersionsCollection.find({ modID: modID }).sort(sort).project(project);
				} else {
					result = modVersionsCollection.find({ modID: modID, "modData.version": version }).sort(sort).project(project);
				}
				var returnresult = await result.toArray();
				console.log(returnresult);
				return returnresult[0];
			});
			return endresult;
		},

		/**
		 * Retrieves the latest version of multiple mods by their IDs.
		 *
		 * This function uses an aggregation pipeline to efficiently fetch the most recent version
		 * of each mod in the provided list of mod IDs.
		 *
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Versions
		 *
		 * @param {string[]} [modIDs] - Array of mod IDs to retrieve.
		 * @param {object} [project] - Fields to include in the results.
		 * @param {object} [sort] - How to sort the data (default is newest first).
		 *
		 * @returns {Promise<ModVersionEntry[]>} A promise that resolves to an array of the latest version of each requested mod.
		 * Returns an empty array if no mod IDs are provided or none are found.
		 */
		Multiple: async function (modIDs = [], project = { uploadTime: 1, modData: 1, modID: 1 }, sort = { uploadTime: -1 }) {
			if (!modIDs.length) return [];

			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modVersionsCollection = db.collection("ModVersions");
				var pipeline = [
					{
						$match: {
							modID: { $in: modIDs },
						},
					},
					{
						$sort: { uploadTime: -1 },
					},
					{
						$group: {
							_id: "$modID",
							doc: { $first: "$$ROOT" },
						},
					},
					{
						$replaceRoot: { newRoot: "$doc" },
					},
					{
						$project: project,
					},
				];
				var result = modVersionsCollection.aggregate(pipeline);
				var returnresult = await result.toArray();
				return returnresult;
			});
			return endresult;
		},

		/**
		 * Retrieves a list of version numbers for a specific `modID`.
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Versions
		 * @param {string} modID - The ID of the mod.
		 * @returns {Promise<string[]>} A list of version numbers, or an empty array if not found.
		 */
		Numbers: async function (modID = "") {
			var sort = { uploadTime: -1 };
			var endresult = await handleClient(async (client) => {
				var db = await client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var restult = await modVersionsCollection.find({ modID: modID }, { projection: { "modData.version": 1, _id: 0 } }).sort(sort);
				return restult.toArray();
			});
			return endresult.map((entry) => entry.modData.version || "Unknown");
		},

		/**
		 * Retrieves lists of version numbers for multiple mod IDs.
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Versions
		 * @param {string[]} modIDs - Array of mod IDs to retrieve versions for.
		 * @returns {Promise<Object>} An object mapping each modID to its array of version numbers.
		 */
		MultipleNumbers: async function (modIDs = []) {
			if (!modIDs.length) return {};

			var sort = { uploadTime: -1 };
			var endresult = await handleClient(async (client) => {
				var db = await client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var result = await modVersionsCollection
					.find({ modID: { $in: modIDs } }, { projection: { "modData.version": 1, modID: 1, _id: 0 } })
					.sort(sort)
					.toArray();

				// Group versions by modID
				const versionsByModId = {};
				result.forEach((item) => {
					if (!versionsByModId[item.modID]) {
						versionsByModId[item.modID] = [];
					}
					versionsByModId[item.modID].push(item.modData.version || "Unknown");
				});

				return versionsByModId;
			});

			return endresult;
		},

		/**
		 * Deletes a specific version of a mod from the database.
		 * If the mod has only one remaining version and that version is deleted, the mod itself is also removed from the `Mods` collection.
		 *
		 * @async
		 * @function Delete
		 * @memberof module:DB.GetMod.Versions
		 *
		 * @param {string} [modID=""] - The unique identifier for the mod.
		 * @param {string} [version=""] - The specific version of the mod to delete.
		 *
		 * @returns {Promise<Object>} A promise that resolves to the result of the deletion operation for the specified mod version.
		 * - If the mod version was deleted, the result contains confirmation of the deletion.
		 * - If the mod had only one version and it is deleted, the mod itself is also removed from the `Mods` collection.
		 *
		 * @throws {Error} Throws an error if there is an issue connecting to the database or performing the deletion operations.
		 *
		 * @example
		 * // Deleting a specific mod version
		 * const result = await GetMod.Versions.Delete("someModID", "1.0.0");
		 * console.log("Deletion Status:", result);
		 *
		 * // If only one version remained and was deleted, the mod will also be removed from the database.
		 */
		Delete: async function (modID = "", version = "") {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var Versions = await modVersionsCollection.find({ modID: modID });
				var restult = await modVersionsCollection.deleteOne({ modID: modID, "modData.version": version });
				if ((await Versions.toArray()).length === 1) {
					var modsCollection = db.collection("Mods");
					await modsCollection.deleteOne({ modID: modID });
				}
				return restult;
			});
			return endresult;
		},
	},

	/**
	 * Functions related to Mod Data.
	 * @namespace Data
	 * @memberof module:DB.GetMod
	 */
	Data: {
		/**
		 * Searches the mod db using the query provided
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Data
		 * @param {string} [query] - The search query
		 * @param {boolean} [verifiedOnly] - if it should only find verified mods
		 * @param {boolean} [IdsOnly] - if it should return modids only
		 * @param {object} [page] - what page of search is this and what size
		 * @param {object} [project] - filter out data
		 * @param {object} [sort] - how to sort the data
		 * @returns {(Promise<ModEntry[]>|string[])} An array of found mods or modid if IdsOnly
		 */
		Search: async function (query = "", verifiedOnly = true, IdsOnly = true, page = { number: 1, size: 200 }, project = {}, sort = { uploadTime: -1 }) {
			//{
			//    $or: [
			//        { "modData.modID": { $regex: query, $options: 'i' } },
			//        { "modData.name": { $regex: query, $options: 'i' } },
			//        { "modData.version": { $regex: query, $options: 'i' } },
			//        { "modData.author": { $regex: query, $options: 'i' } },
			//        { "modData.shortDescription": { $regex: query, $options: 'i' } },
			//        { "modData.modloaderVersion": { $regex: query, $options: 'i' } },
			//        { "modData.tags": { $regex: query, $options: 'i' } },
			//        { "modData.electronEntrypoint": { $regex: query, $options: 'i' } },
			//        { "modData.browserEntrypoint": { $regex: query, $options: 'i' } },
			//        { "modData.workerEntrypoint": { $regex: query, $options: 'i' } },
			//    ]
			//}
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var projection = {};
				if (IdsOnly === true) {
					projection = { "modData.modID": 1, _id: 0 };
				}
				if (project) {
					projection = { ...projection, ...project };
				}
				var searchResults = await modsCollection
					.find({
						$and: [JSON.parse(query), ...(verifiedOnly === true ? [{ verified: true }] : verifiedOnly === false ? [{ verified: false }] : [])],
					})
					.project(projection)
					.sort(sort);

				searchResults = searchResults.skip((page.number - 1) * page.size).limit(page.size);
				searchResults = await searchResults.toArray();

				if (IdsOnly === true) {
					searchResults = searchResults.map((entry) => entry.modData.modID);
				} else {
					// Get all mod IDs from search results
					const modIds = searchResults.map((mod) => mod.modID);

					// Fetch all version numbers in a single database query
					const allVersions = await handleClient(async (client) => {
						const db = client.db("SandustryMods");
						const modVersionsCollection = db.collection("ModVersions");
						const results = await modVersionsCollection
							.find({ modID: { $in: modIds } }, { projection: { modID: 1, "modData.version": 1, _id: 0 } })
							.sort({ uploadTime: -1 })
							.toArray();

						// Group versions by modID
						const versionsByModId = {};
						results.forEach((item) => {
							if (!versionsByModId[item.modID]) {
								versionsByModId[item.modID] = [];
							}
							versionsByModId[item.modID].push(item.modData.version || "Unknown");
						});

						return versionsByModId;
					});

					// Assign version numbers to each mod
					searchResults.forEach((mod) => {
						mod.versionNumbers = allVersions[mod.modID] || [];
					});
				}

				return searchResults;
			});
			return endresult;
		},

		/**
		 * Finds unverified mods with optional limit and projection.
		 *
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Data
		 * @param {number} [limit=10000] - Maximum number of mods to return
		 * @param {object} [project={}] - Fields to include in the results
		 * @returns {Promise<ModEntry[]>} Array of unverified mods
		 */
		FindUnverified: async function (limit = 10000, project = {}) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var result = await modsCollection.find({ verified: false }).project(project).limit(limit).toArray();
				return result;
			});
			return endresult;
		},

		/**
		 * Retrieves the data of a specific mod.
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Data
		 * @param {string} [modID] - The ID of the mod.
		 * @param {object} [project] - filter out data
		 * @param {object} [sort] - how to sort the data
		 * @returns {Promise<ModVersionEntry>} The mod version data, or `null` if not found.
		 */
		One: async function (modID = "", project = {}, sort = {}) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var restult = await modsCollection.find({ modID: modID }).sort(sort).project(project).limit(1);
				var returnresult = await await restult.toArray()[0];
				return returnresult;
			});
			return endresult;
		},

		/**
		 * Uploads a mod to the db and automatically adds versions to existing mods if a mod entry exists
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Data
		 * @param {object} [payload]
		 * @param {boolean} [discordBypass]
		 * @returns {Promise<void>}
		 */
		Upload: async function (payload = { filename: "", filedata: "", discordInfo: { id: "", tokenResponse: { access_token: "" } } }, discordBypass = false, bypassUpdateCheck = false) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var versionsCollection = db.collection("ModVersions");
				var modID = crypto.randomUUID();
				var { filename, filedata, discordInfo } = payload;
				if (!filename || !filedata) {
					return "Invalid payload";
				}

				if (!discordBypass) {
					if (!discordInfo || !discordInfo.id || !discordInfo.tokenResponse || !discordInfo.tokenResponse.access_token) {
						return "Invalid discordInfo";
					}
					var isValidUser = await verifyDiscordUser(discordInfo.id, discordInfo.tokenResponse.access_token);
					if (!isValidUser) {
						return "discord user validation failed";
					} else {
						var UserRecord = await GetUser.One(discordInfo.id);
						if (!UserRecord) {
							var User = new UserEntry();
							User.discordID = discordInfo.id;
							User.discordUsername = discordInfo.username;
							User.permissions = ["user"];
							User.description = "new user";
							User.joinedAt = new Date();
							User.banned = false;
							await GetUser.Add(User);
						} else {
							if (UserRecord.banned) {
								return "User is banned";
							}
						}
					}
				}

				var zipBuffer = Buffer.from(filedata, "base64");
				var compressedZipBuffer = await compress(zipBuffer, 10);

				var content = await JSZip.loadAsync(zipBuffer);
				var fileNames = Object.keys(content.files);

				var readmePath = fileNames.find((path) => path.endsWith("README.md"));
				var description = "";
				if (readmePath) {
					var readmeFile = await content.file(readmePath);
					description = await readmeFile.async("text");
				}

				var modInfoPath = fileNames.find((path) => path.endsWith("modinfo.json"));
				var modInfoFile = await content.file(modInfoPath);
				var modInfoContent = await modInfoFile.async("text");
				var modInfo = await JSON.parse(modInfoContent);

				Object.keys(modInfo).forEach((key) => {
					if (typeof modInfo[key] === "string") {
						modInfo[key] = sanitizeHTML(modInfo[key]);
					}
				});

				// HARDCODED FOR NOW
				const modInfoSchema = {
					modID: {
						type: "string",
						pattern: "^[a-zA-Z0-9_.-]+$",
					},
					name: {
						type: "string",
					},
					version: {
						type: "semver",
					},
					author: {
						type: "string",
					},
					fluxloaderVersion: {
						type: "semver",
						default: "",
					},
					shortDescription: {
						type: "string",
						default: "",
					},
					description: {
						type: "string",
						default: "",
					},
					dependencies: {
						type: "object",
						default: {},
					},
					tags: {
						type: "array",
						default: [],
					},
					electronEntrypoint: {
						type: "string",
						default: "",
					},
					gameEntrypoint: {
						type: "string",
						default: "",
					},
					workerEntrypoint: {
						type: "string",
						default: "",
					},
					scriptPath: {
						type: "string",
						default: "",
					},
					configSchema: {
						type: "object",
						default: {},
					},
				};

				const res = Utils.SchemaValidation.validate(modInfo, modInfoSchema);
				if (!res.success) return `modinfo.json invalid: ${res.source} : ${res.error}`;

				var modData = {
					...modInfo,
					description: description,
				};

				// Use the modID from modinfo.json instead of a random one
				modID = modInfo.modID;

				// Check if a mod with this ID exists
				var existingMod = await modsCollection.findOne({ modID: modID });

				// If mod exists, check ownership (unless bypassUpdateCheck is true)
				if (existingMod && !bypassUpdateCheck) {
					if (existingMod.Author.discordID !== discordInfo.id) {
						return "A mod with this modID already exists and belongs to another user. Please use a different modID.";
					} else {
						if (existingMod.modData.version === modData.version) {
							return "Mod with this modID and version already exists. Please update the version number.";
						}
						return "UPDATE_EXISTING_MOD:" + modID;
					}
				}

				var modEntry = existingMod;
				var uploadTime = new Date();

				// Create a new mod entry
				if (modEntry == null) {
					modEntry = {
						modID: modID,
						modData: modData,
						Author: {
							discordID: discordInfo.id,
							discordUsername: discordInfo.username,
						},
						votes: 0,
						uploadTime: uploadTime,
						verified: false,
					};
					await modsCollection.insertOne(modEntry);
				}

				// Update the existing mod entry
				else {
					modEntry.modData = modData;
					modEntry.uploadTime = uploadTime;
					await modsCollection.replaceOne({ modID: modID }, modEntry);
				}

				// Create a new mod version entry
				var modVersionEntry = {
					modID: modEntry.modID,
					modfile: compressedZipBuffer.toString("base64"),
					modData: modData,
					uploadTime: uploadTime,
					downloadCount: 0,
				};

				await versionsCollection.insertOne(modVersionEntry);
				var action = new ActionEntry();
				action.action = `Uploaded mod ${modData.name} ID ${modID} version ${modData.version}`;
				action.discordID = discordInfo.id;
				GetAction.Add(action);
				return modID;
			});
			return endresult;
		},

		/**
		 * Updates a mod entry in the database.
		 *
		 * This function updates an existing mod entry in the `Mods` collection, identified by its unique `modID`.
		 *
		 * @async
		 * @function Update
		 * @memberof module:DB.GetMod.Data
		 *
		 * @param {string} [modID=""] - The unique identifier of the mod to update.
		 * @param {ModEntry} [entry=new modEntry()] - The mod entry data containing the updated values.
		 *
		 * @returns {Promise<Object>} A promise that resolves to the result of the update operation.
		 * - Contains details about the success of the update.
		 *
		 * @throws {Error} Throws an error if there is an issue connecting to the database or updating the mod entry.
		 *
		 * @example
		 * // Update a mod's verification status
		 * const modToUpdate = await GetMod.Data.One("someModID");
		 * if (modToUpdate) {
		 *     modToUpdate.verified = true;
		 *     const result = await GetMod.Data.Update("someModID", modToUpdate);
		 *     console.log("Update Status:", result);
		 * }
		 */
		Update: async function (modID = "", entry = new ModEntry()) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var result = await modsCollection.updateOne({ modID: modID }, { $set: entry });
				return result;
			});
			return endresult;
		},

		/**
		 * Fetches a random mod from the database.
		 *
		 * @async
		 * @function
		 * @memberof module:DB.GetMod.Data
		 * @param {boolean} [verifiedOnly=true] - Whether to only return verified mods
		 * @param {object} [project={}] - Fields to include in the results
		 * @returns {Promise<ModEntry|null>} A promise that resolves to a random mod or null if none found
		 *
		 * @example
		 * // Get a random verified mod
		 * const randomMod = await GetMod.Data.random();
		 *
		 * // Get a random mod regardless of verification status
		 * const anyRandomMod = await GetMod.Data.random(null);
		 */
		Random: async function (verifiedOnly = true, project = {}) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");

				var query = {};
				if (verifiedOnly === true) {
					query.verified = true;
				} else if (verifiedOnly === false) {
					query.verified = false;
				}

				var count = await modsCollection.countDocuments(query);

				if (count === 0) {
					return null;
				}

				var random = Math.floor(Math.random() * count);

				var result = await modsCollection.find(query).project(project).skip(random).limit(1).toArray();

				return result.length > 0 ? result[0] : null;
			});

			return endresult;
		},
	},

	/**
	 * Deletes a mod and all its associated versions from the database based on the provided mod ID.
	 *
	 * This function removes the mod record from the `Mods` collection and all corresponding entries from the `ModVersions` collection.
	 *
	 * @async
	 * @function Delete
	 * @memberof module:DB.GetMod
	 *
	 * @param {string} [modID=""] - The unique identifier for the mod to be deleted.
	 *
	 * @returns {Promise<Object>} A promise that resolves to an object containing the results of the deletion:
	 * - `modDB` (Object): The result of the deletion operation for the mod in the `Mods` collection.
	 * - `VersionsDB` (Object): The result of the deletion operation for the mod versions in the `ModVersions` collection.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or performing the deletion operations.
	 *
	 * @example
	 * // Deleting a mod and its versions
	 * const result = await GetMod.Delete("someModID");
	 * console.log("Mod Deletion Status:", result.modDB);
	 * console.log("Version Deletion Status:", result.VersionsDB);
	 */
	Delete: async function (modID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var modsCollection = db.collection("Mods");
			var restult = await modsCollection.deleteOne({ modID: modID });
			var modVersionsCollection = await db.collection("ModVersions");
			var restult2 = await modVersionsCollection.deleteMany({ modID: modID });
			return { modDB: restult, VersionsDB: restult2 };
		});
		return endresult;
	},
};

/**
 * Functions related to user management in the database.
 * @namespace GetUser
 * @memberof module:DB
 */
var GetUser = {
	/**
	 * Retrieves a single user from the database using their discord ID.
	 *
	 * @async
	 * @function One
	 * @memberof module:DB.GetUser
	 *
	 * @param {string} [discordID] - The discord ID of the user to retrieve.
	 *
	 * @returns {Promise<Object|null>} A promise that resolves to the user object if found, or `null` if no user exists with the given discord ID.
	 *
	 * @throws {Error} Throws an error if there is an issue with connecting to the database or retrieving the user data.
	 *
	 * @example
	 * // Retrieve user with a specific discord ID
	 * const user = await GetUser.One("123456789012345678");
	 * if (user) {
	 *     console.log("User found:", user);
	 * } else {
	 *     console.log("User not found.");
	 * }
	 */
	One: async function (discordID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var restult = await userCollection.findOne({ discordID: discordID });
			return restult;
		});
		return endresult;
	},

	/**
	 * Adds a new user to the database or retrieves the existing user if they already exist.
	 *
	 * If the user with the specified `discordID` already exists, their data is retrieved and returned.
	 * If they do not exist, a new user entry is created and added to the database.
	 *
	 * @async
	 * @function Add
	 * @memberof module:DB.GetUser
	 *
	 * @param {UserEntry} [userData=new userEntry()] - The user data to add, represented as an instance of `userEntry`.
	 *
	 * @returns {Promise<Object>} A promise that resolves to the existing or newly created user object from the database.
	 *
	 * @throws {Error} Throws an error if there is an issue with connecting to the database or inserting the user data.
	 *
	 * @example
	 * // Add a new user or retrieve an existing user
	 * const userData = {
	 *     discordID: "123456789012345678",
	 *     username: "testUser",
	 *     roles: ["admin", "moderator"],
	 *     joinedAt: Date.now()
	 * };
	 *
	 * const user = await GetUser.Add(userData);
	 * console.log("User in database:", user);
	 */
	Add: async function (userData = new UserEntry()) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var userExists = await userCollection.find({ discordID: userData.discordID }).limit(1).toArray();
			if (userExists.length > 0) {
				var result = userExists[0];
				return result;
			} else {
				var restult = await userCollection.insertOne(userData);
				return restult;
			}
		});
		return endresult;
	},

	/**
	 * Bans a user by updating their record in the database.
	 *
	 * This function marks a user as banned in the `Users` collection by setting the `banned` field to `true`.
	 *
	 * @async
	 * @function Ban
	 * @memberof module:DB.GetUser
	 *
	 * @param {string} [discordID=""] - The discord ID of the user to be banned.
	 *
	 * @returns {Promise<Object>} A promise that resolves to the result of the update operation.
	 * - The result contains information about the success of the update.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or updating the user record.
	 *
	 * @example
	 * // Banning a user with a given discord ID
	 * const result = await GetUser.Ban("123456789012345678");
	 * if (result.modifiedCount > 0) {
	 *     console.log("User banned successfully.");
	 * } else {
	 *     console.log("User not found or ban status not updated.");
	 * }
	 */
	Ban: async function (discordID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var restult = await userCollection.updateOne({ discordID: discordID }, { $set: { banned: true } });
			return restult;
		});
		return endresult;
	},

	/**
	 * Unbans a user by updating their record in the database.
	 *
	 * This function marks a user as not banned in the `Users` collection by setting the `banned` field to `false`.
	 *
	 * @async
	 * @function Unban
	 * @memberof module:DB.GetUser
	 *
	 * @param {string} [discordID=""] - The discord ID of the user to be unbanned.
	 *
	 * @returns {Promise<Object>} A promise that resolves to the result of the update operation.
	 * - The result contains information about the success of the update.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or updating the user record.
	 *
	 * @example
	 * // Unbanning a user with a given discord ID
	 * const result = await GetUser.Unban("123456789012345678");
	 * if (result.modifiedCount > 0) {
	 *     console.log("User unbanned successfully.");
	 * } else {
	 *     console.log("User not found or ban status not updated.");
	 * }
	 */
	Unban: async function (discordID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var restult = await userCollection.updateOne({ discordID: discordID }, { $set: { banned: false } });
			return restult;
		});
		return endresult;
	},

	/**
	 * Updates a user's permissions by adding or removing a specific permission.
	 *
	 * @async
	 * @function UpdatePermissions
	 * @memberof module:DB.GetUser
	 *
	 * @param {string} [discordID=""] - The discord ID of the user to update.
	 * @param {string} [permission=""] - The permission to add or remove.
	 * @param {boolean} [add=true] - Whether to add (true) or remove (false) the permission.
	 *
	 * @returns {Promise<Object>} A promise that resolves to the result of the update operation.
	 * - The result contains information about the success of the update.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or updating the user record.
	 *
	 * @example
	 * // Adding admin permission to a user
	 * const result = await GetUser.UpdatePermissions("123456789012345678", "admin", true);
	 * if (result.modifiedCount > 0) {
	 *     console.log("Permission added successfully.");
	 * } else {
	 *     console.log("User not found or permission not updated.");
	 * }
	 *
	 * // Removing admin permission from a user
	 * const result = await GetUser.UpdatePermissions("123456789012345678", "admin", false);
	 * if (result.modifiedCount > 0) {
	 *     console.log("Permission removed successfully.");
	 * } else {
	 *     console.log("User not found or permission not updated.");
	 * }
	 */
	UpdatePermissions: async function (discordID = "", permission = "", add = true) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var operation = add ? { $push: { permissions: permission } } : { $pull: { permissions: permission } };
			var restult = await userCollection.updateOne({ discordID: discordID }, operation);
			return restult;
		});
		return endresult;
	},

	/**
	 * Searches for users by discord ID or username.
	 *
	 * @async
	 * @function Search
	 * @memberof module:DB.GetUser
	 *
	 * @param {string} [search=""] - The search query to match against discord ID or username.
	 * @param {number} [limit=50] - The maximum number of results to return.
	 *
	 * @returns {Promise<Object[]>} A promise that resolves to an array of user objects matching the search criteria.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or performing the search.
	 *
	 * @example
	 * // Search for users with "john" in their username
	 * const users = await GetUser.Search("john");
	 * console.log(`Found ${users.length} users matching "john"`);
	 */
	Search: async function (search = "", limit = 50) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var query = search
				? {
						$or: [{ discordID: { $regex: search, $options: "i" } }, { discordUsername: { $regex: search, $options: "i" } }],
				  }
				: {};
			var restult = await userCollection.find(query).limit(limit).toArray();
			return restult;
		});
		return endresult;
	},

	/**
	 * Lists users with pagination.
	 *
	 * @async
	 * @function List
	 * @memberof module:DB.GetUser
	 *
	 * @param {number} [limit=50] - The maximum number of results to return.
	 * @param {Object} [query={}] - Additional query parameters to filter users.
	 *
	 * @returns {Promise<Object[]>} A promise that resolves to an array of user objects.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or retrieving the users.
	 *
	 * @example
	 * // List the first 20 users
	 * const users = await GetUser.List(20);
	 * console.log(`Retrieved ${users.length} users`);
	 *
	 * // List banned users
	 * const bannedUsers = await GetUser.List(50, { banned: true });
	 * console.log(`Found ${bannedUsers.length} banned users`);
	 */
	List: async function (limit = 50, query = {}) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var restult = await userCollection.find(query).limit(limit).toArray();
			return restult;
		});
		return endresult;
	},
};

/**
 * Functions related to action logging
 * @namespace GetAction
 * @memberof module:DB
 */
var GetAction = {
	/**
	 * Adds a new action entry to the database.
	 *
	 * @async
	 * @function Add
	 * @memberof module:DB.GetAction
	 *
	 * @param {Object} [action=new ActionEntry()] - The action entry to insert into the database.
	 * Must follow the structure of an `ActionEntry` object.
	 *
	 * @returns {Promise<Object>} A promise that resolves to the result of the insert operation.
	 * - Contains details about the success of the insertion.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or inserting the action.
	 */
	Add: async function (action = new ActionEntry()) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var restult = await actionCollection.insertOne(action);
			return restult;
		});
		return endresult;
	},

	/**
	 * Retrieves action entries from the database based on the provided query.
	 *
	 * @async
	 * @function Get
	 * @memberof module:DB.GetAction
	 *
	 * @param {Object} [query={}] - The query object to filter actions from the database.
	 * If no query is provided, all actions are retrieved.
	 *
	 * @param {Object} [page={number:1,size:200}] - Pagination parameters
	 * @param {number} [page.number=1] - The page number to retrieve (starting from 1)
	 * @param {number} [page.size=200] - The number of results per page
	 *
	 * @returns {Promise<Object[]>} A promise that resolves to an array of actions matching the query.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or retrieving the actions.
	 *
	 * @example
	 * // Get the first 50 actions for a specific user
	 * const actions = await GetAction.Get(
	 *   { discordID: "123456789012345678" },
	 *   { number: 1, size: 50 }
	 * );
	 * console.log(`Found ${actions.length} actions`);
	 */
	Get: async function (query = {}, page = { number: 1, size: 200 }) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var restult = await actionCollection
				.find(query)
				.skip((page.number - 1) * page.size)
				.limit(page.size)
				.sort({ time: -1 })
				.toArray();
			return restult;
		});
		return endresult;
	},

	/**
	 * Updates an existing action entry in the database.
	 *
	 * This function modifies an action entry in the `Actions` collection, identified by its unique `_id`.
	 *
	 * @async
	 * @function Update
	 * @memberof module:DB.GetAction
	 *
	 * @param {Object} [action] - The action entry to update, which must include:
	 * - `_id`: The unique identifier of the action to update.
	 * - Other fields to be updated with their new values.
	 *
	 * @returns {Promise<Object>} A promise that resolves to the result of the update operation.
	 * - Contains details about the success of the update.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or updating the action entry.
	 *
	 */
	Update: async function (action = new ActionEntry()) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var restult = await actionCollection.updateOne({ _id: action._id }, { $set: action });
			return restult;
		});
		return endresult;
	},

	/**
	 * Counts the number of action entries in the database that match the provided query.
	 *
	 * @async
	 * @function Count
	 * @memberof module:DB.GetAction
	 *
	 * @param {Object} [query={}] - The query object to filter actions for counting.
	 * If no query is provided, all actions are counted.
	 *
	 * @returns {Promise<number>} A promise that resolves to the count of actions matching the query.
	 *
	 * @throws {Error} Throws an error if there is an issue connecting to the database or counting the actions.
	 *
	 * @example
	 * // Count all actions
	 * const totalActions = await GetAction.Count();
	 * console.log(`Total actions: ${totalActions}`);
	 *
	 * // Count actions for a specific user
	 * const userActions = await GetAction.Count({ discordID: "123456789012345678" });
	 * console.log(`Actions for user: ${userActions}`);
	 */
	Count: async function (query = {}) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var count = await actionCollection.countDocuments(query);
			return count;
		});
		return endresult;
	},
};

/**
 * Handles operations using a MongoDB client.
 * This function is exported to allow other modules to use it for custom database operations.
 *
 * @async
 * @function handleClient
 * @memberof module:DB
 * @param {function(MongoClient): Promise<any>} [runClient] - Async function to run with the connected client.
 * @returns {Promise<any>} The result of the operation.
 */
async function exportedHandleClient(runClient = async function (client = new MongoClient(mongoUri)) {}) {
	return await handleClient(runClient);
}

module.exports = {
	GetMod,
	GetUser,
	GetAction,
	handleClient: exportedHandleClient,
};

function verifyDiscordUser(userId, accessToken) {
	return new Promise((resolve, reject) => {
		var options = {
			hostname: "discord.com",
			path: "/api/users/@me",
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
			},
		};

		var req = https.request(options, (res) => {
			let data = "";

			res.on("data", (chunk) => {
				data += chunk.toString();
			});

			res.on("end", () => {
				try {
					var userResponse = JSON.parse(data);

					// Check if the user ID matches the ID from the token response
					if (res.statusCode === 200 && userResponse.id === userId) {
						resolve(true);
					} else {
						console.warn("User ID mismatch or token is invalid:", userResponse);
						resolve(false);
					}
				} catch (err) {
					console.error("Error parsing user verification response:", err);
					resolve(false);
				}
			});
		});

		req.on("error", (err) => {
			console.error("Error verifying discord user:", err);
			resolve(false);
		});

		req.end();
	});
}
