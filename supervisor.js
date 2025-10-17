const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectDir = path.resolve(__dirname);
const srcDir = path.join(projectDir, "src");
const triggerFile = path.join(projectDir, "deploy.trigger");
const entryFile = path.join(srcDir, "index.js");
let currentChild = null;
let isDeploying = false;
let firstRun = true;

async function runCmd(cmd, args) {
	return new Promise((resolve, reject) => {
		const p = spawn(cmd, args, { cwd: projectDir, stdio: "inherit", shell: true });
		p.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed (${code})`))));
	});
}

async function deploy({ checkGit = false, checkInstall = false }) {
	if (isDeploying) {
		console.log("Deploy already in progress, skipping deploy");
		return;
	}
	isDeploying = true;

	console.log("==> Deploying fluxloader server");

	if (currentChild) {
		console.log("> Killing old server process");
		currentChild.kill("SIGTERM");
	}

	if (checkGit) {
		console.log("> Checking for git updates");
		await runCmd("git", ["pull"]);
	}

	if (checkInstall) {
		console.log("> Checking for npm install");
		await runCmd("npm", ["i"]);
	}

	console.log("> Starting new server process");
	const child = spawn(process.execPath, [entryFile], { cwd: srcDir, stdio: "inherit" });

	child.on("exit", (code, signal) => {
		console.log(`Server exited (code=${code}, signal=${signal})`);
		if (currentChild === child) currentChild = null;
	});

	currentChild = child;
	isDeploying = false;
}

(async () => {
	if (fs.existsSync(triggerFile)) {
		try {
			fs.unlinkSync(triggerFile);
		} catch (e) {
			console.error("Failed to unlink deploy.trigger:", e);
			return;
		}
	}

	fs.watchFile(triggerFile, async () => {
		if (isDeploying) {
			console.log("Deploy already in progress, ignoring trigger");
			return;
		}
		if (firstRun) {
			await deploy({ checkGit: false, checkInstall: false }).catch((e) => console.error(e));
			firstRun = false;
		} else {
			console.log("<== Detected deploy.trigger change! redeploying...\n");
			deploy({ checkGit: true, checkInstall: true }).catch((e) => console.error(e));
		}
	});
})();
