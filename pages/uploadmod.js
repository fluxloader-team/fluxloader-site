/**
 * @file uploadmod.js
 * @description Handles the mod upload API endpoint for mod list site.
 * This file manages POST requests to upload a mod, validate the payload and user, and interact with the database.
 */

var Mongo = require("./../shared/db");
var Utils = require("../utils");

var log = new Utils.Log("sandustry.web.pages.uploadmod", "./sandustry.web.main.txt", true);

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
		req.on("data", (chunk) => (body += chunk.toString()));

		const checkError = (uploadResult) => {
			if (!uploadResult) {
				throw new Error("Invalid payload. No response from upload.");
			}
			if (uploadResult.includes("modinfo.json invalid:")) {
				throw new Error(uploadResult);
			}
			switch (uploadResult) {
				// Error message case
				case "Invalid payload":
					throw new Error('Invalid payload. "filename" and "filedata" are required.');
				case "Invalid discordInfo":
					throw new Error('Invalid discordInfo. "id" and "username" are required.');
				case "discord user validation failed":
					throw new Error("discord user validation failed. The provided user cannot be verified.");
				case "Missing modID in modinfo.json. A unique modID is required.":
					throw new Error("Missing modID in modinfo.json. A unique modID is required.");
				case "A mod with this modID already exists and belongs to another user. Please use a different modID.":
					throw new Error("A mod with this modID already exists and belongs to another user. Please use a different modID.");
				case "User is banned":
					throw new Error("Your account has been banned from uploading mods.");
				case "Mod with this modID and version already exists. Please update the version number.":
					throw new Error("Mod with this modID and version already exists. Please update the version number.");
				// Otherwise assume it's a success or an update
				default:
					return;
			}
		};

		req.on("end", async () => {
			try {
				var payload = await JSON.parse(body);
				var { filename } = payload;

				// Upload the payload
				var uploadResult = await Mongo.GetMod.Data.Upload(payload);
				checkError(uploadResult);

				// Check if this is an update to an existing mod
				if (typeof uploadResult === "string" && uploadResult.startsWith("UPDATE_EXISTING_MOD:")) {
					const modID = uploadResult.split(":")[1];

					// Upload the payload (as an update using 3rd parameter as true)
					uploadResult = await Mongo.GetMod.Data.Upload(payload, false, true);
					checkError(uploadResult);

					// Succesful upload as an update
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

				// Successful upload of a new mod
				await res.writeHead(200, { "Content-Type": "application/json" });
				await res.end(
					JSON.stringify({
						message: `File ${filename} uploaded successfully.`,
					})
				);
			} catch (error) {
				log.error("Error in uploadmod API:" + error.stack ? error.stack : error.message);
				await res.writeHead(400, { "Content-Type": "application/json" });
				await res.end(JSON.stringify({ error: error.message }));
			}
		});
	},
};
