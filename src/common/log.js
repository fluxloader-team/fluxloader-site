const fs = require("fs");
const path = require("path");
const colors = require("colors/safe");

class Log {
	constructor(name = "", filePath = "./fluxloader.log", withDate = true, flushInterval = 3000) {
		this.name = name;
		this.filePath = path.resolve(filePath);
		this.withDate = withDate;
		this.saveInterval = flushInterval;
		this.logLevel = "debug";
		this.saveQueue = [];
		this.isStopped = false;

		this.ensureLogFile();
		this.startLogSaver();
	}

	ensureLogFile() {
		try {
			const dir = path.dirname(this.filePath);
			if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
			if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, "");
		} catch (e) {
			console.error(`Logger: cannot create log file at ${this.filePath}:`, e.message);
		}
	}

	startLogSaver() {
		// Save logs on an interval but async and unref so it doesn't block exit
		this.saveTimer = setInterval(() => this.saveLogsAsync(), this.saveInterval);
		this.saveTimer.unref();
	}

	async saveLogsAsync() {
		if (this.saveQueue.length === 0 || this.isStopped) return;
		const data = this.saveQueue.join("\n") + "\n";
		this.saveQueue.length = 0;
		try {
			await fs.promises.appendFile(this.filePath, data);
			if (globalThis.config?.discord?.serverLog && globalThis.config?.discord?.runbot) {
				this.sendToDiscord(data);
			}
		} catch (e) {
			console.error(`Logger: async save failed: ${e.message}`);
		}
	}

	saveLogs() {
		if (this.saveQueue.length === 0 || this.isStopped) return;
		const data = this.saveQueue.join("\n") + "\n";
		this.saveQueue.length = 0;
		try {
			fs.appendFileSync(this.filePath, data);
			if (globalThis.config?.discord?.serverLog && globalThis.config?.discord?.runbot) {
				this.sendToDiscord(data);
			}
		} catch (e) {
			console.error(`Logger: save failed: ${e.message}`);
		}
	}

	async sendToDiscord(data) {
		try {
			const chunks = data.match(/(.|[\r\n]){1,1800}/g);
			const ch = globalThis.discord.client.channels.cache.get(globalThis.config.discord.serverLogChannel);
			for (const chunk of chunks) {
				await ch.send("```ansi\n" + chunk + "\n```");
			}
		} catch (e) {
			console.error("Logger: Discord send failed:", e.message);
		}
	}

	stopSaver() {
		clearInterval(this.saveTimer);
		this.isStopped = true;
		this.saveLogs();
	}

	log(colorFn, level, input) {
		const timestamp = new Date().toISOString();
		const prefix = this.withDate ? `${this.name} ${timestamp}` : this.name;
		this.saveQueue.push(`${prefix} | ${input}`);
		try {
			console.log(colorFn(`${prefix} | `) + input);
		} catch {}
	}

	info(msg) {
		this.log(colors.green, "info", msg);
	}
	debug(msg) {
		if (this.logLevel === "debug") this.log(colors.yellow, "debug", msg);
	}
	error(msg) {
		this.log(colors.red, "error", msg);
	}
}

module.exports = Log;
