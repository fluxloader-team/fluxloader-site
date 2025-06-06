/**
 * @file uploadmod.js
 * @description Handles the mod upload API endpoint for mod list site.
 * This file manages POST requests to upload a mod, validate the payload and user, and interact with the database.
 */

var Mongo = require("./../Shared/DB");

/**
 * @namespace uploadmod
 * @memberof module:api
 */
module.exports = {
	/**
	 * The Paths that use this module
	 * @type {Array<string>}
	 * @memberof module:api.uploadmod
	 */
	paths: ["/api/uploadmod"],

	/**
	 * Handles client requests to the upload mod API.
	 *
	 * @function run
	 * @memberof module:api.uploadmod
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 */
	run: function (req, res) {
		if (req.method !== "POST") {
			res.writeHead(404, { "Content-Type": "text/html" });
			res.end("This is an API endpoint.");
			return;
		}

		let body = "";
		req.on("data", (chunk) => {
			body += chunk.toString();
		});

		req.on("end", async () => {
			try {
				var payload = await JSON.parse(body);
				var { filename } = payload;

				var uploadResult = await Mongo.GetMod.Data.Upload(payload);

				// Check if this is an update to an existing mod
				if (typeof uploadResult === "string" && uploadResult.startsWith("UPDATE_EXISTING_MOD:")) {
					const modID = uploadResult.split(":")[1];

					// Process the update
					const updateResult = await Mongo.GetMod.Data.Upload(payload, false, true); // Pass true to bypass the update check

					// Return a special response for updates
					await res.writeHead(200, { "Content-Type": "application/json" });
					await res.end(
						JSON.stringify({
							message: `File ${filename} uploaded successfully.`,
							isUpdate: true,
							modID: modID,
						})
					);
					return;
				}

				switch (uploadResult) {
					case "Invalid payload":
						throw new Error('Invalid payload. "filename" and "filedata" are required.');
						break;
					case "Invalid discordInfo":
						throw new Error('Invalid discordInfo. "id" and "username" are required.');
						break;
					case "Discord user validation failed":
						throw new Error("Discord user validation failed. The provided user cannot be verified.");
						break;
					case "Missing modID in modinfo.json. A unique modID is required.":
						throw new Error("Missing modID in modinfo.json. A unique modID is required.");
						break;
					case "A mod with this modID already exists and belongs to another user. Please use a different modID.":
						throw new Error("A mod with this modID already exists and belongs to another user. Please use a different modID.");
						break;
					case "User is banned":
						throw new Error("Your account has been banned from uploading mods.");
						break;
					default:
						// Check if uploadResult is a string (likely an error message)
						if (typeof uploadResult === "string" && uploadResult !== filename) {
							throw new Error(uploadResult);
						}
						break;
				}
				await res.writeHead(200, { "Content-Type": "application/json" });
				await res.end(
					JSON.stringify({
						message: `File ${filename} uploaded successfully.`,
					})
				);
			} catch (error) {
				console.error("Error processing upload:", error);

				await res.writeHead(400, { "Content-Type": "application/json" });
				await res.end(JSON.stringify({ error: error.message }));
			}
		});
	},
};
