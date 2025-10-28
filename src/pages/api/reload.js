const Utils = require("../../common/utils.js");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const GITHUB_SECRET = globalThis.config.githubSecret;

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
	/**
	 * @param {import("http").IncomingMessage} req 
	 * @param {import("http").ServerResponse} res 
	 */
	run: function (req, res) {
		logger.info("Received reload request");

		let body = "";
		req.on("data", (chunk) => (body += chunk));
		req.on("end", () => {
			if (!(globalThis.requireGithubSecretForReload === false)) {
				if (!verifySignature(req, body)) {
					res.writeHead(401);
					logger.info("Invalid signature on reload request");
					return res.end("Invalid signature");
				}
				logger.info("Valid signature on reload request");
			}

			// Only trigger on tags
			const payload = JSON.parse(body);
			if (!payload.ref.startsWith("refs/tags/")) {
				logger.info("Reload request ignored (not a tag)");
				res.writeHead(200);
				return res.end("Ignored (not a tag)");
			}

			try {
				const tagName = payload.ref.replace("refs/tags/", "");
				logger.info(`Deploy triggered by tag: ${tagName}`);

				// Signal the supervisor to redeploy
				const triggerFile = path.resolve(__dirname, "../../../deploy.trigger");
				logger.info(`Triggering deploy by writing to: ${triggerFile}`);
				fs.writeFileSync(triggerFile, Date.now().toString());

				res.writeHead(200);
				res.end("Deploy triggered");
			} catch (err) {
				logger.error(`Failed to write deploy trigger: ${err.message}`);
				res.writeHead(500);
				res.end("Deploy failed");
			}
		});
	},
};
