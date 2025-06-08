/**
 * @file modversiongenerator.js
 * @description Generates mod version `.zip` files with various metadata for the modding platform.
 * This module handles the creation of multiple versions, including tags, semantic versioning, and metadata generation.
 * This module is for validating and testing the modding platform with realistic sample data.
 */

var JSZip = require("jszip");
var Utils = require("../utils");
var crypto = require("crypto");
var Mongo = require("../shared/db");

var  log = new Utils.Log("sandustry.web.pages.generatemod", "./sandustry.web.main.txt", true);

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
	 * This function generates random semantic versions of mods, assigns metadata (such as tags and mod information),
	 * and packages each version into a `.zip` file. All generated mods are uploaded to the mod and version database
	 * as if they were uploaded by real users. The function creates a pool of authors (65% of the total mods count)
	 * and randomly assigns authors to each mod.
	 *
	 * ### Query Parameters:
	 * - **count**: *(optional)* Number of mods to generate. Defaults to 100 if not specified.
	 *   - *Example*: `count=50`
	 *   - *Valid Range*: 1 to 1,000,000,000
	 *
	 * ### Response:
	 * Returns a JSON response with information about the generation process, including:
	 * - **message**: A message indicating the number of mods and authors being generated
	 * - **count**: The number of mods that will be generated
	 * - **authorCount**: The number of unique authors created for the mods
	 *
	 * ### Process Details:
	 * 1. Creates a pool of author names (65% of the total mod count)
	 * 2. For each mod:
	 *    - Generates a random mod name with a random author from the pool
	 *    - Creates 10 versions with incrementing semantic versioning
	 *    - Assigns random tags from a predefined list
	 *    - Creates modinfo.json with metadata
	 *    - Adds README.md and entry point files
	 *    - Uploads each version to the database
	 *
	 * @async
	 * @function run
	 * @memberof module:web.generateMod
	 * @param {IncomingMessage} req - The HTTP request object. Can include a 'count' query parameter to specify the number of mods to generate.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends a JSON response with information about the generation process.
	 *
	 * @example <caption>Example 1: Generate default number of mods (100)</caption>
	 * // Browser fetch API
	 * async function generateDefaultMods() {
	 *   try {
	 *     const response = await fetch('/generateMod');
	 *     const data = await response.json();
	 *     console.log(`Generating ${data.count} mods with ${data.authorCount} authors`);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error generating mods:", error);
	 *   }
	 * }
	 *
	 * @example <caption>Example 2: Generate specific number of mods</caption>
	 * // Browser fetch API with query parameter
	 * async function generateSpecificMods(count) {
	 *   try {
	 *     const response = await fetch(`/generateMod?count=${count}`);
	 *     const data = await response.json();
	 *     console.log(`Generating ${data.count} mods with ${data.authorCount} authors`);
	 *     return data;
	 *   } catch (error) {
	 *     console.error("Error generating mods:", error);
	 *   }
	 * }
	 */
	run: async function (req, res) {
		try {
			var count = 100;
			var maxCount = 1000000000;

			if (req.url.includes("?")) {
				var queryParams = new URLSearchParams(req.url.split("?")[1]);
				if (queryParams.has("count")) {
					var requestedCount = parseInt(queryParams.get("count"));
					if (!isNaN(requestedCount) && requestedCount > 0) {
						count = Math.min(requestedCount, maxCount);
					}
				}
			}

			// Function to generate random strings
			var randomString = (length) =>
				Math.random()
					.toString(36)
					.substring(2, 2 + length);

			// Function to increment semantic version
			var incrementSemVer = ({ major, minor, patch }) => {
				var type = Math.floor(Math.random() * 3); // 0 = major, 1 = minor, 2 = patch
				if (type === 0) {
					return { major: major + 1, minor: 0, patch: 0 };
				} else if (type === 1) {
					return { major, minor: minor + 1, patch: 0 };
				} else {
					return { major, minor, patch: patch + 1 };
				}
			};

			// Predefined static list of 25 realistic tags
			var predefinedTags = [
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

			// Generate a pool of authors (65% of the total count)
			var authorCount = Math.max(5, Math.floor(count * 0.65));
			var authorPool = [];

			for (var i = 0; i < authorCount; i++) {
				authorPool.push(`author-${randomString(8)}`);
			}

			log.info(`Generated author pool with ${authorPool.length} authors`);

			// Function to generate tags for a version
			var generateTagsForVersion = (previousTags = null) => {
				// Number of tags to use for this version
				var numTags = Math.floor(Math.random() * 6) + 10; // 10 to 15 tags
				var tags = previousTags ? [...previousTags] : [];

				// If this isn't the first version, randomly replace some tags
				if (previousTags) {
					var numReplacements = Math.floor(Math.random() * 4) + 1; // Replace 1-3 tags
					for (var i = 0; i < numReplacements; i++) {
						// Remove a random tag and replace it
						var indexToReplace = Math.floor(Math.random() * tags.length);
						var newTag = predefinedTags[Math.floor(Math.random() * predefinedTags.length)];
						tags[indexToReplace] = newTag;
					}
				} else {
					// For the first version, generate unique random tags
					while (tags.length < numTags) {
						var newTag = predefinedTags[Math.floor(Math.random() * predefinedTags.length)];
						if (!tags.includes(newTag)) {
							tags.push(newTag);
						}
					}
				}

				return tags;
			};

			// Function to generate a random modinfo.json file
			var generateModInfo = (modName, version, tags, modID, author) => {
				return {
					modID: modID,
					name: modName,
					version: version,
					author: author,
					shortDescription: `A test mod for the Electron Modloader`,
					fluxloaderVersion: ">=1.0.0",
					dependencies: {
						[`module-${randomString(6)}`]: `=1.0.0`,
						[`module-${randomString(6)}`]: `=2.0.0`,
					},
					tags: tags,
					electronEntrypoint: "entry.electron.js",
					gameEntrypoint: "entry.game.js",
					workerEntrypoint: "entry.worker.js",
					scriptPath: "",
					configSchema: {
						someSetting: true,
						someValue: Math.floor(Math.random() * 1000),
					},
				};
			};

			async function generate() {
				// Generate a random number of versions between 1 and 5
				var numVersions = 10;

				// Create a main zip archive to hold all version zips
				var mainZip = new JSZip();

				// Generate a random mod name
				var modName = `testmod-${randomString(5)}`;

				// Start with the first version
				var currentVersion = { major: 1, minor: 0, patch: 0 };

				// Tags for the first version
				var currentTags = generateTagsForVersion();
				var discordInfo = {
					id: "FakeMod",
					username: "FakeMod",
				};

				// Select a random author from the author pool
				var authorname = authorPool[Math.floor(Math.random() * authorPool.length)];

				// Generate `.zip` files for each version
				for (var i = 0; i < numVersions; i++) {
					var modID = crypto.randomUUID();
					var versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;

					// Create a zip archive for this version
					var versionZip = new JSZip();

					// Add modinfo.json to this version archive
					var modInfo = generateModInfo(modName, versionString, currentTags, modID, authorname);
					versionZip.file(
						"modinfo.json",
						JSON.stringify(modInfo, null, 2) // Prettify JSON
					);

					// Add entry point files to the version zip
					versionZip.file("entry.electron.js", `// Electron entry point for version ${versionString}`);
					versionZip.file("entry.game.js", `// Game entry point for version ${versionString}`);
					versionZip.file("entry.worker.js", `// Worker entry point for version ${versionString}`);

					// Add README
					versionZip.file(
						"README.md",
						`# h1 Heading
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading


## Horizontal Rules

___

---

***

## Emphasis

**This is bold text**

__This is bold text__

*This is italic text*

_This is italic text_

~~Strikethrough~~

## Lists

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar


## Code

\`\`\`
    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code
\`\`\`

Syntax highlighting

\`\`\`js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |
`
					);

					currentVersion = incrementSemVer(currentVersion);
					currentTags = generateTagsForVersion(currentTags);
					var payload = {
						filename: `${modName}_${versionString}`,
						filedata: arrayBufferToBase64(await versionZip.generateAsync({ type: "arraybuffer" })),
						discordInfo: discordInfo,
					};
					var uploadResult = await Mongo.GetMod.Data.Upload(payload, true);
				}
			}
			// Send response with information about the operation
			res.writeHead(200, {
				"Content-Type": "application/json",
			});
			res.end(
				JSON.stringify({
					message: `Generating ${count} mods with ${authorPool.length} authors`,
					count: count,
					authorCount: authorPool.length,
				})
			);

			// Generate the specified number of mods
			for (var i = 0; i < count; i++) {
				await generate();
			}

			log.info(`Successfully generated ${count} mods with ${authorPool.length} unique authors`);
		} catch (error) {
			// Handle errors here
			log.info("Error generating mod versions:" + error);
			res.writeHead(500, { "Content-Type": "application/json" });
			res.end(JSON.stringify({ error: "Failed to generate mod versions" }));
		}
	},
};

function arrayBufferToBase64(buffer) {
	var byteArray = new Uint8Array(buffer);
	return btoa(byteArray.reduce((data, byte) => data + String.fromCharCode(byte), ""));
}
