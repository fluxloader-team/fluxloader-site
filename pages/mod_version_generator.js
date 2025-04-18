/**
 * @file mod_version_generator.js
 * @description Generates mod version `.zip` files with various metadata for the modding platform.
 * This module handles the creation of multiple versions, including tags, semantic versioning, and metadata generation.
 * This module is for validating and testing
 */


const colors = require("colors");
const JSZip = require("jszip");
const Utils = require("./../utils");
const crypto = require("crypto");
const log = new Utils.log.log(colors.green("Sandustry.web.pages.generateMod"), "./sandustry.web.main.txt", true);
var Mongo = require("./../Shared/DB");

/**
 * @namespace generateMod
 * @memberof module:web
 */
module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:web.generateMod
	 */
	paths: ["/generateMod"],
	/**
	 * Handles the mod version generation process.
	 *
	 * This function generates random semantic versions of a mod, assigns metadata (such as tags and mod information),
	 * and packages each version into a `.zip` file. and then is uploaded to the mod and version DB as if it was uploaded
	 *
	 * @async
	 * @function run
	 * @memberof module:web.generateMod
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends the error response.
	 */
	run: async function (req, res) {
		var client = new MongoClient(mongoUri);
		try {
			// Function to generate random strings
			const randomString = (length) =>
				Math.random()
					.toString(36)
					.substring(2, 2 + length);

			// Function to increment semantic version
			const incrementSemVer = ({ major, minor, patch }) => {
				const type = Math.floor(Math.random() * 3); // 0 = major, 1 = minor, 2 = patch
				if (type === 0) {
					return { major: major + 1, minor: 0, patch: 0 };
				} else if (type === 1) {
					return { major, minor: minor + 1, patch: 0 };
				} else {
					return { major, minor, patch: patch + 1 };
				}
			};

			// Predefined static list of 25 realistic tags
			const predefinedTags = [
				"multiplayer",
				"sandbox",
				"mod",
				"game",
				"strategy",
				"action",
				"fun",
				"creative",
				"builder",
				"survival",
				"teamwork",
				"indie",
				"hardcore",
				"simulation",
				"adventure",
				"puzzle",
				"co-op",
				"realistic",
				"casual",
				"competitive",
				"retro",
				"fast-paced",
				"rpg",
				"platformer",
				"tactical",
			];

			// Function to generate tags for a version
			const generateTagsForVersion = (previousTags = null) => {
				// Number of tags to use for this version
				const numTags = Math.floor(Math.random() * 6) + 10; // 10 to 15 tags
				const tags = previousTags ? [...previousTags] : [];

				// If this isn't the first version, randomly replace some tags
				if (previousTags) {
					const numReplacements = Math.floor(Math.random() * 4) + 1; // Replace 1-3 tags
					for (let i = 0; i < numReplacements; i++) {
						// Remove a random tag and replace it
						const indexToReplace = Math.floor(Math.random() * tags.length);
						const newTag = predefinedTags[Math.floor(Math.random() * predefinedTags.length)];
						tags[indexToReplace] = newTag;
					}
				} else {
					// For the first version, generate unique random tags
					while (tags.length < numTags) {
						const newTag = predefinedTags[Math.floor(Math.random() * predefinedTags.length)];
						if (!tags.includes(newTag)) {
							tags.push(newTag);
						}
					}
				}

				return tags;
			};

			// Function to generate a random modinfo.json file
			const generateModInfo = (modName, version, tags,modID) => {
				return {
					modID:modID,
					name: modName,
					version: version,
					author: `author-${randomString(8)}`,
					shortDescription: `A test mod for the Electron Modloader`,
					modloaderVersion: ">=1.0.0",
					dependencies: {
						[`module-${randomString(6)}`]: `=1.0.0`,
						[`module-${randomString(6)}`]: `=2.0.0`,
					},
					tags: tags,
					electronEntrypoint: "entry.electron.js",
					browserEntrypoint: "entry.browser.js",
					workerEntrypoint: "entry.worker.js",
					defaultConfig: {
						someSetting: true,
						someValue: Math.floor(Math.random() * 1000),
					},
				};
			};

			// Generate a random number of versions between 1 and 5
			const numVersions = 10

			// Create a main zip archive to hold all version zips
			const mainZip = new JSZip();

			// Generate a random mod name
			const modName = `testmod-${randomString(5)}`;

			// Start with the first version
			let currentVersion = { major: 1, minor: 0, patch: 0 };

			// Tags for the first version
			let currentTags = generateTagsForVersion();
			var discordInfo = {
				id:"FakeMod",
				username: "FakeMod",
			}
			// Generate `.zip` files for each version
			for (let i = 0; i < numVersions; i++) {
				var modID = crypto.randomUUID();
				const versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;

				// Create a zip archive for this version
				const versionZip = new JSZip();

				// Add modinfo.json to this version archive
				const modInfo = generateModInfo(modName, versionString, currentTags);
				versionZip.file(
					"modinfo.json",
					JSON.stringify(modInfo, null, 2) // Prettify JSON
				);

				// Add entry point files to the version zip
				versionZip.file("entry.electron.js", `// Electron entry point for version ${versionString}`);
				versionZip.file("entry.browser.js", `// Browser entry point for version ${versionString}`);
				versionZip.file("entry.worker.js", `// Worker entry point for version ${versionString}`);

				// Add README
				versionZip.file("README.md", `# Test Mod\nA test mod for the Electron Modloader`);

				currentVersion = incrementSemVer(currentVersion);
				currentTags = generateTagsForVersion(currentTags);
				var payload = {filename: `${modName}_${versionString}`,filedata: arrayBufferToBase64(await versionZip.generateAsync({type:"arraybuffer"})),discordInfo: discordInfo }
				var uploadResult = await Mongo.GetMod.Data.Upload(payload,true);
			}


			// Set correct headers and send the main zip file
			res.writeHead(200, {
				"Content-Type": "application/json",
			});
			res.end(JSON.stringify("{}"));

			// Log success
			log.log(`Generated mod with ${numVersions} version zips: ${modName}`);
		} catch (error) {
			// Handle errors here
			log.log("Error generating mod versions:" + error);
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Failed to generate mod versions" }));
		}
	},
};
function arrayBufferToBase64(buffer) {
	const byteArray = new Uint8Array(buffer);
	return btoa(byteArray.reduce((data, byte) => data + String.fromCharCode(byte), ""));
}