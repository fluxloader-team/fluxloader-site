/**
 * @file uploadmod.js
 * @description Handles the mod upload API endpoint for mod list site.
 * This file manages POST requests to upload a mod, validate the payload and user, and interact with the database.
 */


var colors = require("colors");
var Utils = require("./../utils");
var log = new Utils.log.log(colors.green("Sandustry.web.pages.upload"), "./sandustry.web.main.txt", true);
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
	 * @function run
	 * @memberof module:api.uploadmod
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @example
	 * // Example usage for POST request to this endpoint:
	 * fetch("/api/uploadmod", {
	 *    method: "POST",
	 *    body: JSON.stringify({
	 *       filename: "example-mod.zip",
	 *       filedata: "encodedDataString",
	 *       discordInfo: {
	 *          id: "12345",
	 *          username: "DiscordUser"
	 *       }
	 *    })
	 * });
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
				switch(uploadResult){
					case "Invalid payload":
						throw new Error('Invalid payload. "filename" and "filedata" are required.');
						break;
					case "Invalid discordInfo":
						throw new Error('Invalid discordInfo. "id" and "username" are required.');
						break;
					case "Discord user validation failed":
						throw new Error('Discord user validation failed. The provided user cannot be verified.');
						break;
					default:
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
