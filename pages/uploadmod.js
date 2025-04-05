var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var ejs = require('ejs')
var { exec } = require('child_process');
var Utils = require('./../utils')
var { MongoClient } = require("mongodb");
var { compress } = require("@mongodb-js/zstd");
var https = require('https');
var JSZip = require("jszip");
const log = new Utils.log.log(colors.green("Sandustry.web.pages.upload"), "./sandustry.web.main.txt", true);
const mongoUri = globalThis.Config.mongodb.uri;

module.exports = {
    paths: ['/uploadmod'],
    run: function (req, res) {
        if (req.method !== "POST") {
            res.writeHead(404, { "Content-Type": "text/html" });
            res.end("This is an API endpoint.");
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            const client = new MongoClient(mongoUri);

            try {
                const payload = await JSON.parse(body);
                const { filename, filedata, discordInfo } = payload;
                var modID = crypto.randomUUID();
                if(payload.modID){
                    modID = payload.modID
                }
                if (!filename || !filedata) {
                    throw new Error('Invalid payload. "filename" and "filedata" are required.');
                }
                if (!discordInfo || !discordInfo.id || !discordInfo.tokenResponse || !discordInfo.tokenResponse.access_token) {
                    throw new Error('Invalid "discordInfo". Discord user information with an access token is required.');
                }
                var isValidUser = await verifyDiscordUser(discordInfo.id, discordInfo.tokenResponse.access_token);
                if (!isValidUser) {
                    throw new Error('Discord user validation failed. The provided user cannot be verified.');
                }

                const zipBuffer = Buffer.from(filedata, "base64");

                const compressedZipBuffer = await compress(zipBuffer,10);
                //upload to mongodb
                await client.connect();
                const db = client.db("SandustryMods");
                const modsCollection = db.collection("Mods");
                const versionsCollection = db.collection("ModVersions");
                let modEntry = await modsCollection.findOne({ "modID": modID });

                var content = await JSZip.loadAsync(zipBuffer);
                var fileNames = Object.keys(content.files);
                var modInfoPath = fileNames.find((path) => path.endsWith('modinfo.json'));
                var modInfoFile = content.file(modInfoPath);
                var modInfoContent = await modInfoFile.async('text');
                var modinfo = JSON.parse(modInfoContent);

                if (!modEntry) {
                    modEntry = {
                        modID: modID,
                        modinfo: modinfo,
                        Author: {
                            discordID: discordInfo.id,
                            discordUsername: discordInfo.username
                        }
                    };
                    await modsCollection.insertOne(modEntry);
                }
                const modVersionEntry = {
                    modID: modEntry.modID,
                    modfile: compressedZipBuffer,
                    modinfo: modinfo,
                    uploadTime: new Date(),
                    downloadCount: 0
                };
                await versionsCollection.insertOne(modVersionEntry);

                await res.writeHead(200, { "Content-Type": "application/json" });
                await res.end(JSON.stringify({
                    message: `File ${filename} uploaded successfully.`
                }));
            } catch (error) {
                console.error('Error processing upload:', error);

                await res.writeHead(400, { "Content-Type": "application/json" });
                await res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
}

function verifyDiscordUser(userId, accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'discord.com',
            path: '/api/users/@me',
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk.toString();
            });

            res.on('end', () => {
                try {
                    const userResponse = JSON.parse(data);

                    // Check if the user ID matches the ID from the token response
                    if (res.statusCode === 200 && userResponse.id === userId) {
                        resolve(true);
                    } else {
                        console.warn('User ID mismatch or token is invalid:', userResponse);
                        resolve(false);
                    }
                } catch (err) {
                    console.error('Error parsing user verification response:', err);
                    resolve(false);
                }
            });
        });

        req.on('error', (err) => {
            console.error('Error verifying Discord user:', err);
            resolve(false);
        });

        req.end();
    });
}
