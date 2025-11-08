const DB = require("../../../common/db");
const Utils = require("../../../common/utils.js");

const logger = new Utils.Log("pages.uploadmod");

module.exports = {
	paths: ["/api/uploadmod"],
	/**
	 * @param {import("http").IncomingMessage} req
	 * @param {import("http").ServerResponse} res
	 */
	run: function (req, res) {
		if (req.method !== "POST") {
			res.writeHead(404, { "Content-Type": "text/html" });
			res.end("This is an API endpoint.");
			return;
		}

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

		let body = "";
		req.on("data", (chunk) => (body += chunk.toString()));
		req.on("end", async () => {
			try {
				var payload = await JSON.parse(body);
				var { filename } = payload;

				// Upload the payload
				var uploadResult = await DB.mods.data.upload(payload);
				checkError(uploadResult);

				// Check if this is an update to an existing mod
				if (typeof uploadResult === "string" && uploadResult.startsWith("UPDATE_EXISTING_MOD:")) {
					const modID = uploadResult.split(":")[1];

					// Upload the payload (as an update using 3rd parameter as true)
					uploadResult = await DB.mods.data.upload(payload, false, true);
					checkError(uploadResult);

					// Succesful upload as an update
					await res.writeHead(201, { "Content-Type": "application/json" });
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
				await res.writeHead(201, { "Content-Type": "application/json" });
				await res.end(
					JSON.stringify({
						message: `File ${filename} uploaded successfully.`,
					})
				);
			} catch (error) {
				logger.error("Error in uploadmod API:" + error.stack ? error.stack : error.message);
				await res.writeHead(400, { "Content-Type": "application/json" });
				await res.end(JSON.stringify({ error: error.message }));
			}
		});
	},
};
