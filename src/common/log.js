const colors = require("colors");
const fs = require("fs");

class Log {
	currentLogs = [];
	name = "";
	path = "";
	date = false;
	saveIntervalDuration = 0;
	saveLoopInterval = {};
	logLevel = "debug";

	constructor(name = "", path = "./fluxloader.log", date = true, saveIntervalDuration = 10000) {
		this.name = name;
		this.path = path;
		this.date = date;
		this.saveIntervalDuration = saveIntervalDuration;
		this.startSave();
	}

	startSave() {
		this.saveLoopInterval = setInterval(() => {
			if (this.currentLogs.length == 0) {
			} else {
				if (globalThis.config.discord.serverLog && globalThis.config.discord.runbot) {
					var botlog = this.currentLogs;
					var logstosend = [];
					botlog.forEach((log) => {
						if (
							log.length +
								logstosend.join(`
`).length >
							1800
						) {
							globalThis.discord.client.channels.cache.get(globalThis.config.discord.serverLogChannel).send(
								`Log @ ${Date.now()}
` +
									"```ansi" +
									`
` +
									logstosend.join(`
`) +
									"```"
							);
							logstosend = [];
						} else {
							logstosend.push(log);
						}
					});
					if (logstosend.length > 0) {
						globalThis.discord.client.channels.cache.get(globalThis.config.discord.serverLogChannel).send(
							`Log @ ${Date.now()}
` +
								"```ansi" +
								`
` +
								logstosend.join(`
`) +
								"```"
						);
					}
				}
				try {
					if (!fs.existsSync(this.path)) {
						fs.writeFileSync(this.path, "");
					}
					fs.appendFileSync(
						this.path,
						this.currentLogs.join(`
`) +
							`
`
					);
				} catch (e) {}

				this.currentLogs = [];
			}
		}, this.saveIntervalDuration);
	}

	stopSave() {
		clearInterval(this.saveLoopInterval);
	}

	info(Input = "") {
		var logMessage = "";
		if (this.date == true) {
			logMessage = `${colors.green(this.name + " | " + Date.now())} : ${Input}`;
		} else {
			logMessage = `${colors.green(this.name)} : ${Input}`;
		}
		this.currentLogs.push(logMessage);
		console.log(logMessage);
	}

	debug(Input = "") {
		if (this.logLevel == "debug") {
			var logMessage = "";
			if (this.date == true) {
				logMessage = `${colors.yellow(this.name + " | " + Date.now())} : ${Input}`;
			} else {
				logMessage = `${colors.yellow(this.name)} : ${Input}`;
			}
			this.currentLogs.push(logMessage);
			console.log(logMessage);
		}
	}

	error(Input = "") {
		var logMessage = "";
		if (this.date == true) {
			logMessage = `${colors.red(this.name + " | " + Date.now())} : ${Input}`;
		} else {
			logMessage = `${colors.red(this.name)} : ${Input}`;
		}
		this.currentLogs.push(logMessage);
		console.log(logMessage);
	}
}

module.exports = Log;
