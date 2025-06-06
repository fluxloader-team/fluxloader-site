// ---------------------------------
// Log system
// ---------------------------------
// Custom Log system
/**
 * @author FluxLoaderApp <support@fluxloader.app>
 */

// requires
var colors = require("colors");
var fs = require("fs");

//code

/**
 * @param {string} [Name] - Log name
 * @param {string} [Path] - Path to log file
 * @param {boolean} [date] - Add date to log
 * @param {number} [SaveInterval] - Interval to save
 */
class log {
	CurrentLog = [];
	Name = "";
	Path = "";
	date = false;
	SaveInterval = 0;
	SaveLoopInterval = {};
	loglevel = "debug"; //debug info
	constructor(Name = "", Path = "./log.txt", date = false, SaveInterval = 10000) {
		this.Name = Name;
		this.Path = Path;
		this.date = date;
		this.SaveInterval = SaveInterval;
		this.startSave();
	}
	logLevel(level) {
		this.loglevel = level;
	}
	startSave() {
		this.SaveLoopInterval = setInterval(() => {
			if (this.CurrentLog.length == 0) {
			} else {
				if (globalThis.Config.discord.serverLog) {
					var botlog = this.CurrentLog;
					var logstosend = [];
					botlog.forEach((log) => {
						if (
							log.length +
								logstosend.join(`
`).length >
							1800
						) {
							globalThis.Discord.client.channels.cache.get(globalThis.Config.discord.serverLogChannel).send(
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
						globalThis.Discord.client.channels.cache.get(globalThis.Config.discord.serverLogChannel).send(
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
					var tmpPath = this.Path.replace("web/", "web/" + new Date().toLocaleDateString().replace(/\//g, "_") + "/");
					if (!fs.existsSync(tmpPath.replace(/\/[A-z]*\.txt/g, ""))) {
						fs.mkdirSync(tmpPath.replace(/\/[A-z]*\.txt/g, ""));
					}
					fs.appendFileSync(
						this.Path.replace("web/", "web/" + new Date().toLocaleDateString().replace(/\//g, "_") + "/"),
						this.CurrentLog.join(`
`),
						"utf-8"
					);
				} catch (e) {}

				this.CurrentLog = [];
			}
		}, this.SaveInterval);
	}
	stopSave() {
		clearInterval(this.SaveLoopInterval);
	}
	/**
	 * @param {string} [Input] - What to log
	 */
	info(Input = "") {
		var ThisLog = "";

		if (this.date == true) {
			ThisLog = `${colors.green(this.Name + " | " + Date.now())} : ${Input}`;
		} else {
			ThisLog = `${colors.green(this.Name)} : ${Input}`;
		}
		this.CurrentLog.push(ThisLog);
		console.log(ThisLog);
	}
	debug(Input = "") {
		if (this.loglevel == "debug") {
			var ThisLog = "";

			if (this.date == true) {
				ThisLog = `${colors.yellow(this.Name + " | " + Date.now())} : ${Input}`;
			} else {
				ThisLog = `${colors.yellow(this.Name)} : ${Input}`;
			}
			this.CurrentLog.push(ThisLog);
			console.log(ThisLog);
		}
	}
	error(Input = "") {
		var ThisLog = "";

		if (this.date == true) {
			ThisLog = `${colors.red(this.Name + " | " + Date.now())} : ${Input}`;
		} else {
			ThisLog = `${colors.red(this.Name)} : ${Input}`;
		}
		this.CurrentLog.push(ThisLog);
		console.log(ThisLog);
	}
}

//exports

module.exports = {
	log: log,
};
