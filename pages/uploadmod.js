var colors = require("colors");
var http = require("http");
var os = require("os");
var Websocket = require("ws");
var crypto = require("crypto");
var util = require("util");
var fs = require("fs");
var ejs = require("ejs");
var { exec } = require("child_process");
var Utils = require("./../utils");
var { MongoClient } = require("mongodb");
var { compress } = require("@mongodb-js/zstd");
var https = require("https");
var JSZip = require("jszip");
var log = new Utils.log.log(colors.green("Sandustry.web.pages.upload"), "./sandustry.web.main.txt", true);
var mongoUri = globalThis.Config.mongodb.uri;
var sanitizeHtml = require("sanitize-html");
module.exports = {
	paths: ["/api/uploadmod"],
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
			var client = new MongoClient(mongoUri);

			try {
				var payload = await JSON.parse(body);
				var { filename, filedata, discordInfo } = payload;
				var modID = crypto.randomUUID();
				var newmod = false;
				if (payload.modID) {
					newmod = true;
					modID = payload.modID;
				}
				if (!filename || !filedata) {
					throw new Error('Invalid payload. "filename" and "filedata" are required.');
				}
				if (!discordInfo || !discordInfo.id || !discordInfo.tokenResponse || !discordInfo.tokenResponse.access_token) {
					throw new Error('Invalid "discordInfo". Discord user information with an access token is required.');
				}
				var isValidUser = await verifyDiscordUser(discordInfo.id, discordInfo.tokenResponse.access_token);
				if (!isValidUser) {
					throw new Error("Discord user validation failed. The provided user cannot be verified.");
				}

				var zipBuffer = Buffer.from(filedata, "base64");

				var compressedZipBuffer = await compress(zipBuffer, 10);
				//upload to mongodb
				await client.connect();
				var db = client.db("SandustryMods");
				var modsCollection = db.collection("Mods");
				var versionsCollection = db.collection("ModVersions");

				var content = await JSZip.loadAsync(zipBuffer);
				var fileNames = Object.keys(content.files);

				// Load the README.md file
				var readmePath = fileNames.find((path) => path.endsWith("README.md"));
				var readmeFile = await content.file(readmePath);
				var description = await readmeFile.async("text");

				// Load the modinfo and sanitize it
				var modInfoPath = fileNames.find((path) => path.endsWith("modinfo.json"));
				var modInfoFile = await content.file(modInfoPath);
				var modInfoContent = await modInfoFile.async("text");
				var modInfo = await JSON.parse(modInfoContent);
				Object.keys(modInfo).forEach((key) => {
					if (typeof modInfo[key] === "string") {
						modInfo[key] = sanitizeHtml(modInfo[key]);
					}
				});

				// Add extra information to modinfo to create moddata
				var modData = {
					...modInfo,
					description: description,
				};

				var modEntry = {};
				modEntry = await modsCollection.findOne({ modID: modID, "Author.discordID": discordInfo.id });
				if (!modEntry) {
					modEntry = await modsCollection.findOne({ "modData.name": modData.name, "Author.discordID": discordInfo.id });
				}
				modID = modEntry ? modEntry.modID : modID;
				if (!modEntry) {
					modEntry = {
						modID: modID,
						modData: modData,
						Author: {
							discordID: discordInfo.id,
							discordUsername: discordInfo.username,
						},
					};
					await modsCollection.insertOne(modEntry);
				}
				var modVersionEntry = {
					modID: modEntry.modID,
					modfile: compressedZipBuffer.toString("base64"),
					modData: modData,
					uploadTime: new Date(),
					downloadCount: 0,
				};
				await versionsCollection.insertOne(modVersionEntry);

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
			console.error("Error verifying Discord user:", err);
			resolve(false);
		});

		req.end();
	});
}
