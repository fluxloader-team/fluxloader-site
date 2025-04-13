var colors = require('colors');
var http = require("http")
var os = require("os")
var Websocket = require("ws")
var crypto = require("crypto")
var util = require('util')
var fs = require('fs')
var { exec } = require('child_process');
var Utils = require('./utils')
var path = require('path');
var Discord = require('./DiscordBot.js');

const CONFIG_PATH = path.join(__dirname, 'config.json');
globalThis.Config
var defaultConfig = {
    discord: {
        clientId: 'CLIENT_ID',
        clientSecret: 'CLIENT_SECRET',
        redirectUri: 'https://example.com/auth/discord/callback',
        token: 'TOKEN',
        runbot: false,
        serverLog: true,
        serverLogChannel: 'SERVER_LOG_CHANNEL',
    },
    mongodb:{
        uri: 'mongodb://localhost:27017/somejoinstring',
    },
    git:{
        pull: true,
    }
};
globalThis.Config = defaultConfig;

var lastRepoHash = '';
const log = new Utils.log.log(colors.green("Sandustry.web.main"), "./sandustry.web.main.txt", true);

process.on('uncaughtException', function (err) {
    log.log(`Caught exception: ${err.stack}`);
});

if (!fs.existsSync(CONFIG_PATH)) {
    log.log('Config file not found, generating default config.json...');
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    log.log('Default config.json generated.');
    process.exit(0);
}
globalThis.Config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));


globalThis.Templates = {"filename": "content"}

var pages = {"/": {
    run: function (req,res){}
}}

var LoadTemplates = function (){
    log.log("Loading templates")
    fs.readdirSync( "./templates").forEach(file => {
        Templates[file] = fs.readFileSync("./templates/"+file, "utf8")
    })
    log.log("Templates loaded")
}
var LoadPages = function (){
    log.log("Loading pages")
    fs.readdirSync( "./pages").forEach(file => {
        if(require.resolve("./pages/"+file)){
            delete require.cache[require.resolve("./pages/"+file)]
        }
        var temprequire = require("./pages/"+file)
        temprequire.paths.forEach(path => {
            pages[path] = temprequire;
        })

    })
    log.log("pages loaded")
}
function computeRepoHash(directory = './') {
    var folderHash = crypto.createHash('sha256');

    function hashDirectory(dir) {
        var files = fs.readdirSync(dir);
        files.forEach(file => {
            var fullPath = path.join(dir, file);
            var fileStat = fs.statSync(fullPath);

            if (fileStat.isDirectory()) {
                hashDirectory(fullPath);
            } else if (fileStat.isFile()) {
                folderHash.update(fs.readFileSync(fullPath));
            }
        });
    }

    hashDirectory(directory);
    return folderHash.digest('hex');
}

function performUpdate() {
    if(globalThis.Config.git.pull){
        exec('git pull', (error, stdout, stderr) => {
            if (error) {
                log.log(`Error running git pull: ${error}`);
                return;
            }
            log.log(stdout);

            const newRepoHash = computeRepoHash();
            log.log(newRepoHash)
            if (newRepoHash !== lastRepoHash) {
                log.log('Changes detected in the repository. Reloading templates and pages...');
                lastRepoHash = newRepoHash;

                LoadTemplates();
                LoadPages();
            } else {
                log.log('No changes detected.');
            }
        });
    }else{
        const newRepoHash = computeRepoHash();
        log.log(newRepoHash)
        if (newRepoHash !== lastRepoHash) {
            log.log('Changes detected in the repository. Reloading templates and pages...');
            lastRepoHash = newRepoHash;

            LoadTemplates();
            LoadPages();
        } else {
            log.log('No changes detected.');
        }
    }
}


LoadTemplates();
LoadPages();
lastRepoHash = computeRepoHash();
log.log(lastRepoHash)
var WebRequestHandler = function (req, res){
    var url = req.url
    var urlSplit = url.split("?")
    var urlName = urlSplit[0]
    var template = pages[urlName]
    if(template){
        template.run(req, res)
    }else{
        res.writeHead(404, {"Content-Type": "text/html"})
        res.end("404")
    }
}
setInterval(performUpdate, 10000);

if (globalThis.Config.discord.runbot) {
    try {
        Discord.init();
        Discord.start();
    } catch (error) {
        log.log(`Error initializing or starting Discord bot: ${error.stack}`);
    }
}
var WebServer = http.createServer(WebRequestHandler).listen(20221)