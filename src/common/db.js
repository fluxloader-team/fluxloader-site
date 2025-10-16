const { MongoClient } = require("mongodb");
const Utils = require("../common/utils.js");
const https = require("https");
const { compress } = require("@mongodb-js/zstd");
const JSZip = require("jszip");
const sanitizeHTML = require("sanitize-html");
const fs = require("fs");

const logger = new Utils.Log("sandustry.common.DB", "./sandustry.common.txt", true);

var modInfoSchemaContent = fs.readFileSync("common/schema.mod-info.json", "utf8");
var modInfoSchema = JSON.parse(modInfoSchemaContent);
var mongoUri = globalThis.config.mongodb.uri;
var globalClient = null;

class ModEntry {
	modID = "";
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
	Author = {
		discordID: "",
		discordUsername: "",
	};
	uploadTime = new Date();
	votes = 0;
	verified = false;
}

class ModVersionEntry {
	modID = "";
	modfile = "";
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
	uploadTime = new Date();
	downloadCount = 0;
}

class UserEntry {
	discordID = "";
	discordUsername = "";
	permissions = [""];
	description = "";
	joinedAt = new Date();
	banned = false;
}

class ActionEntry {
	discordID = "";
	action = "";
	time = new Date();
	logged = false;
}

async function handleClient(runClient) {
	if (!globalClient) {
		globalClient = new MongoClient(mongoUri);
		await globalClient.connect();
	}
	try {
		if (runClient) {
			return await runClient(globalClient);
		}
	} catch (err) {
		logger.info(`${err}`);
		throw err;
	}
}

async function exportedHandleClient(runClient = async function (client = new MongoClient(mongoUri)) {}) {
	return await handleClient(runClient);
}

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

var getMod = {
	versions: {
		All: async function (modID = "", project = {}, sort = { uploadTime: -1 }) {
			var endresult = await handleClient(async (client) => {
				var db = await client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var result = await modVersionsCollection.find({ modID: modID }).sort(sort).project(project);
				return result.toArray();
			});
			return endresult;
		},

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
				return returnresult[0];
			});
			return endresult;
		},

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

		Numbers: async function (modID = "") {
			var sort = { uploadTime: -1 };
			var endresult = await handleClient(async (client) => {
				var db = await client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var result = await modVersionsCollection.find({ modID: modID }, { projection: { "modData.version": 1, _id: 0 } }).sort(sort);
				return result.toArray();
			});
			return endresult.map((entry) => entry.modData.version || "Unknown");
		},

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

		Delete: async function (modID = "", version = "") {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modVersionsCollection = await db.collection("ModVersions");
				var Versions = await modVersionsCollection.find({ modID: modID });
				var result = await modVersionsCollection.deleteOne({ modID: modID, "modData.version": version });
				if ((await Versions.toArray()).length === 1) {
					var modsCollection = db.collection("Mods");
					await modsCollection.deleteOne({ modID: modID });
				}
				return result;
			});
			return endresult;
		},
	},

	Data: {
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

		FindUnverified: async function (limit = 10000, project = {}) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var result = await modsCollection.find({ verified: false }).project(project).limit(limit).toArray();
				return result;
			});
			return endresult;
		},

		One: async function (modID = "", project = {}, sort = {}) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				logger.info(`Searching for modID: ${modID} with project: ${JSON.stringify(project)}`);
				var result = modsCollection.find({ modID: modID }).sort(sort).project(project).limit(1);
				const res = await result.toArray();
				return res[0];
			});
			return endresult;
		},

		Upload: async function (payload = { filename: "", filedata: "", discordInfo: { id: "", tokenResponse: { access_token: "" } } }, discordBypass = false, bypassUpdateCheck = false) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var versionsCollection = db.collection("ModVersions");
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

				// Read as base64, read contents with JSZip, read files from JSZip
				var zipBuffer = Buffer.from(filedata, "base64");
				var content = await JSZip.loadAsync(zipBuffer);
				var fileNames = Object.keys(content.files);

				// Check if all of the files are nested 1 level inside a folder
				let topLevelDirs = new Set();
				let someWithoutDirs = false;
				for (const path of fileNames) {
					let standardized = path.replace(/\\/g, "/");
					let split = standardized.split("/");
					if (split.length > 1) {
						topLevelDirs.add(split[0]);
					} else {
						someWithoutDirs = true;
						break;
					}
				}

				logger.info(`Found ${fileNames.length} total files in the zip: ${fileNames.join(", ")}`);
				logger.info(`Found ${topLevelDirs.size} top-level directories: ${Array.from(topLevelDirs).join(", ")}`);

				// If all files are in 1 common directory then make a new zip with them all moved up 1 level
				if (!someWithoutDirs && topLevelDirs.size == 1) {
					var newContent = new JSZip();
					for ([path, file] of Object.entries(content.files)) {
						let standardized = path.replace(/\\/g, "/");
						let split = standardized.split("/");
						let newPath = split.slice(1).join("/");
						logger.info(`Converting path ${path} to ${newPath}`);
						newContent.file(newPath, file.async("nodebuffer"));
					}

					// Compress the new content
					zipBuffer = await newContent.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
					content = newContent;

					// Update fileNames to reflect the new structure
					fileNames = Object.keys(content.files);
				}

				// Read the modinfo.json file
				var modInfoPath = fileNames.find((path) => path.endsWith("modinfo.json"));
				if (!modInfoPath) return `modinfo.json invalid: doesn't exist`;
				var modInfoFile = content.file(modInfoPath);
				var modInfoContent = await modInfoFile.async("text");
				var modInfo = await JSON.parse(modInfoContent);

				// Overwrite the "description" field with the README.md if it exists
				var readmePath = fileNames.find((path) => path.endsWith("README.md"));
				var description = sanitizeHTML(modInfo.description || "");
				if (readmePath) {
					var readmeFile = content.file(readmePath);
					description = sanitizeHTML(await readmeFile.async("text"));
				}

				// Sanitize modinfo.json properties
				// I'm unsure about this, you may have HTML in your "description" field
				Object.keys(modInfo).forEach((key) => {
					if (typeof modInfo[key] === "string") {
						modInfo[key] = sanitizeHTML(modInfo[key]);
					}
				});

				// Validate the modinfo.json against the schema
				// HARDCODED FOR NOW

				const res = Utils.SchemaValidation.validate(modInfo, modInfoSchema);
				if (!res.success) return `modinfo.json invalid: ${res.source} : ${res.error}`;

				// Produce the final modData row with the modified description
				const modID = modInfo.modID;
				var modData = {
					...modInfo,
					description: description,
				};

				// Check if a mod with this ID exists
				var existingMod = await modsCollection.findOne({ modID });

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

				// Create a new mod entry
				var modEntry = existingMod;
				var uploadTime = new Date();
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

				// Compress it back down for use in the version entry
				var compressedZipBuffer = await compress(zipBuffer, 10);

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

		Update: async function (modID = "", entry = new ModEntry()) {
			var endresult = await handleClient(async (client) => {
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var result = await modsCollection.updateOne({ modID: modID }, { $set: entry });
				return result;
			});
			return endresult;
		},

		async function(verifiedOnly = true, project = {}) {
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

	Delete: async function (modID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var modsCollection = db.collection("Mods");
			var result = await modsCollection.deleteOne({ modID: modID });
			var modVersionsCollection = await db.collection("ModVersions");
			var result2 = await modVersionsCollection.deleteMany({ modID: modID });
			return { modDB: result, VersionsDB: result2 };
		});
		return endresult;
	},
};

var GetUser = {
	One: async function (discordID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var result = await userCollection.findOne({ discordID: discordID });
			return result;
		});
		return endresult;
	},

	Add: async function (userData = new UserEntry()) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var userExists = await userCollection.find({ discordID: userData.discordID }).limit(1).toArray();
			if (userExists.length > 0) {
				var result = userExists[0];
				return result;
			} else {
				var result = await userCollection.insertOne(userData);
				return result;
			}
		});
		return endresult;
	},

	Ban: async function (discordID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var result = await userCollection.updateOne({ discordID: discordID }, { $set: { banned: true } });
			return result;
		});
		return endresult;
	},

	Unban: async function (discordID = "") {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var result = await userCollection.updateOne({ discordID: discordID }, { $set: { banned: false } });
			return result;
		});
		return endresult;
	},

	UpdatePermissions: async function (discordID = "", permission = "", add = true) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var operation = add ? { $push: { permissions: permission } } : { $pull: { permissions: permission } };
			var result = await userCollection.updateOne({ discordID: discordID }, operation);
			return result;
		});
		return endresult;
	},

	Search: async function (search = "", limit = 50) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var query = search
				? {
						$or: [{ discordID: { $regex: search, $options: "i" } }, { discordUsername: { $regex: search, $options: "i" } }],
				  }
				: {};
			var result = await userCollection.find(query).limit(limit).toArray();
			return result;
		});
		return endresult;
	},

	List: async function (limit = 50, query = {}) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var userCollection = db.collection("Users");
			var result = await userCollection.find(query).limit(limit).toArray();
			return result;
		});
		return endresult;
	},
};

var GetAction = {
	Add: async function (action = new ActionEntry()) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var result = await actionCollection.insertOne(action);
			return result;
		});
		return endresult;
	},

	Get: async function (query = {}, page = { number: 1, size: 200 }) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var result = await actionCollection
				.find(query)
				.skip((page.number - 1) * page.size)
				.limit(page.size)
				.sort({ time: -1 })
				.toArray();
			return result;
		});
		return endresult;
	},

	Update: async function (action = new ActionEntry()) {
		var endresult = await handleClient(async (client) => {
			var db = client.db("SandustryMods");
			var actionCollection = db.collection("Actions");
			var result = await actionCollection.updateOne({ _id: action._id }, { $set: action });
			return result;
		});
		return endresult;
	},

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

module.exports = {
	getMod,
	GetUser,
	GetAction,
	handleClient: exportedHandleClient,
};
