const colors = require('colors');
const http = require('http');
const JSZip = require('jszip');
const Utils = require('./../utils');

const log = new Utils.log.log(
    colors.green('Sandustry.web.pages.generateMod'),
    './sandustry.web.main.txt',
    true
);

module.exports = {
    paths: ['/generateMod'],
    run: async function (req, res) {
        try {
            // Function to generate random strings
            const randomString = (length) =>
                Math.random().toString(36).substring(2, 2 + length);

            // Function to increment semantic version
            const incrementSemVer = ({ major, minor, patch }) => {
                // Randomly decide whether to increment major, minor, or just the patch
                const type = Math.floor(Math.random() * 3); // 0 = major, 1 = minor, 2 = patch
                if (type === 0) {
                    return { major: major + 1, minor: 0, patch: 0 };
                } else if (type === 1) {
                    return { major, minor: minor + 1, patch: 0 };
                } else {
                    return { major, minor, patch: patch + 1 };
                }
            };

            // Function to generate a random modinfo.json file
            const generateModInfo = (modName, version) => {
                return {
                    name: modName,
                    version: version,
                    author: `author-${randomString(8)}`,
                    shortDescription: `A test mod for the Electron Modloader`,
                    description: `# Test Mod\nA test mod for the Electron Modloader`,
                    modloaderVersion: '>=1.0.0',
                    dependencies: {
                        [`module-${randomString(6)}`]: `=1.0.0`,
                        [`module-${randomString(6)}`]: `=2.0.0`,
                    },
                    tags: [randomString(5), randomString(10)],
                    electronEntrypoint: 'entry.electron.js',
                    browserEntrypoint: 'entry.browser.js',
                    workerEntrypoint: 'entry.worker.js',
                    defaultConfig: {
                        someSetting: true,
                        someValue: Math.floor(Math.random() * 1000),
                    },
                };
            };

            // Generate a random number of versions between 1 and 5
            const numVersions = Math.floor(Math.random() * 5) + 1;

            // Create a main zip archive to hold all version zips
            const mainZip = new JSZip();

            // Generate a random mod name
            const modName = `testmod-${randomString(5)}`;

            // Start with the first version
            let currentVersion = { major: 1, minor: 0, patch: 0 };

            // Generate `.zip` files for each version
            for (let i = 0; i < numVersions; i++) {
                const versionString = `${currentVersion.major}.${currentVersion.minor}.${currentVersion.patch}`;

                // Create a zip archive for this version
                const versionZip = new JSZip();

                // Add modinfo.json to this version archive
                const modInfo = generateModInfo(modName, versionString);
                versionZip.file(
                    'modinfo.json',
                    JSON.stringify(modInfo, null, 2) // Prettify JSON
                );

                // Add entry point files to the version zip
                versionZip.file(
                    'entry.electron.js',
                    `// Electron entry point for version ${versionString}`
                );
                versionZip.file(
                    'entry.browser.js',
                    `// Browser entry point for version ${versionString}`
                );
                versionZip.file(
                    'entry.worker.js',
                    `// Worker entry point for version ${versionString}`
                );

                // Generate the content of this version's zip
                const versionZipContent = await versionZip.generateAsync({
                    type: 'nodebuffer',
                });

                // Add this version zip to the main zip archive
                mainZip.file(
                    `${modName}-v${versionString}.zip`,
                    versionZipContent
                );

                // Increment to the next version
                currentVersion = incrementSemVer(currentVersion);
            }

            // Generate the main zip file
            const mainZipContent = await mainZip.generateAsync({
                type: 'nodebuffer',
            });

            // Set correct headers and send the main zip file
            res.writeHead(200, {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename=${modName}-versions.zip`,
            });

            res.end(mainZipContent);

            // Log success
            log.success(
                `Generated mod with ${numVersions} version zips: ${modName}`
            );
        } catch (error) {
            // Handle errors here
            log.error('Error generating mod versions:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Failed to generate mod versions' }));
        }
    },
};