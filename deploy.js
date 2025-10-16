const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectDir = path.resolve(__dirname);
const pidFile = path.join(projectDir, "server.pid");
const srcDir = path.join(projectDir, "src");
const entryFile = path.join(srcDir, "index.js");

const argv = process.argv.slice(2);
const noGit = argv.includes("--no-git") || argv.includes("--no-checks");
const noInstall = argv.includes("--no-install") || argv.includes("--no-checks");

function spawnCmd(cmd, args, opts = {}) {
	// shell:true fixes Windows .cmd resolution and is portable
	return spawn(cmd, args, Object.assign({ cwd: projectDir, stdio: "inherit", shell: true }, opts));
}

async function ensureOldProcessDead() {
	if (!fs.existsSync(pidFile)) return;

	const raw = fs.readFileSync(pidFile, "utf8").trim();
	if (!raw) return;

	const oldPid = parseInt(raw, 10);
	if (!oldPid || isNaN(oldPid)) return;

	console.log(`Found old PID ${oldPid}, attempting to kill...`);
	try {
		process.kill(oldPid, "SIGTERM");
		console.log(`Sent SIGTERM to ${oldPid}`);
		// Poll kill(..., 0) every 100ms up to 5s to see if process is gone
		for (let i = 0; i < 50; i++) {
			try {
				process.kill(oldPid, 0);
				await new Promise((r) => setTimeout(r, 100));
			} catch (e) {
				break;
			}
		}
	} catch (e) {
		console.log(`Old process not running or unable to signal: ${e.message}`);
	}
}

(async () => {
	try {
		console.log(`Deploy started (pid=${process.pid}); flags:`, { noGit, noInstall });

		await ensureOldProcessDead();

		if (!noGit) {
			console.log("Pulling latest from git...");
			const git = spawnCmd("git", ["pull"]);
			await new Promise((res, rej) => git.on("close", (code) => (code === 0 ? res() : rej(new Error("git pull failed")))));
		} else {
			console.log("Skipping git pull (flag)");
		}

		if (!noInstall) {
			console.log("Installing npm deps...");
			const npm = spawnCmd("npm", ["ci", "--omit=dev"]);
			await new Promise((res, rej) => npm.on("close", (code) => (code === 0 ? res() : rej(new Error("npm ci failed")))));
		} else {
			console.log("Skipping npm install (flag)");
		}

		console.log("Starting server...");
		const child = spawn("node", [entryFile], { cwd: srcDir, detached: true });
		child.unref();
		const childPid = child.pid || process.pid;
		console.log(`Child started with PID ${childPid}`);

		try {
			fs.writeFileSync(pidFile, String(childPid));
			console.log(`Wrote PID ${childPid} to ${pidFile}`);
		} catch (e) {
			console.warn("Failed to write pid file:", e.message);
		}

		process.exit(0);
	} catch (err) {
		console.error("Deploy failed:", err);
		process.exit(1);
	}
})();
