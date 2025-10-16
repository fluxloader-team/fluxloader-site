const Utils = require("../../common/utils.js");
const crypto = require("crypto");
const path = require("path");
const { spawn } = require("child_process");

const GITHUB_SECRET = process.env.GITHUB_SECRET;

const logger = new Utils.Log("pages.reload");

function verifySignature(req, body) {
	const signature = req.headers["x-hub-signature-256"];
	if (!signature) return false;
	const hmac = crypto.createHmac("sha256", GITHUB_SECRET);
	const digest = "sha256=" + hmac.update(body).digest("hex");
	return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

module.exports = {
	paths: ["/api/reload"],

	run: function (req, res) {
		logger.info("Received reload request");

		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			if (globalThis.requireGithubSecretForReload === true) {
				if (!verifySignature(req, body)) {
					res.writeHead(401);
					return res.end("Invalid signature");
				}
				const payload = JSON.parse(body);
				logger.info(JSON.stringify(payload));
				if (payload.ref !== "refs/heads/main") {
					res.writeHead(200);
					return res.end("Ignored (not main)");
				}
			}

			const baseDir = path.resolve(__dirname, "..", "..", "..");
			const deployScript = path.resolve(baseDir, "deploy.js");

			const child = spawn(process.execPath, [deployScript], { cwd: baseDir, detached: true });
			child.unref();
			console.log(`Spawned deploy script (pid=${child.pid})`);

			res.writeHead(200);
			res.end("Deploy triggered");
		});
	},
};
