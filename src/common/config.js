const fs = require("fs");
const Utils = require("./utils.js");

const logger = new Utils.Log("config");

function isObject(v) {
	return v && typeof v === "object" && !Array.isArray(v);
}

function mergeObjects(target, source) {
	for (const key in source) {
		const targetValue = target[key];
		const sourceValue = source[key];
		if (isObject(sourceValue) && isObject(targetValue)) {
			mergeObjects(targetValue, sourceValue);
		} else if (sourceValue !== undefined) {
			target[key] = sourceValue;
		}
	}
	return target;
}

function parseEnvValue(envValue, existingValue) {
	// Infer type from existing value
	if (typeof existingValue === "boolean") return envValue === "true";
	if (typeof existingValue === "number") return Number(envValue);
	if (typeof existingValue === "string") return envValue;

	// Fallback to just try and guess the type
	if (envValue === "true") return true;
	if (envValue === "false") return false;
	if (!isNaN(envValue) && envValue.trim() !== "") return Number(envValue);
	return envValue;
}

function walkConfigAndApplyEnv(config, path = []) {
	for (const key in config) {
		const existingValue = config[key];
		const nextPath = [...path, key];

		if (isObject(existingValue)) {
			walkConfigAndApplyEnv(existingValue, nextPath);
			continue;
		}

		const envKey = "CONFIG_" + nextPath.join("_").toUpperCase();

		if (process.env[envKey] !== undefined) {
			config[key] = parseEnvValue(process.env[envKey], existingValue);
		}
	}
}

function loadConfig(DEFAULT_CONFIG, CONFIG_PATH) {
	let config = structuredClone(DEFAULT_CONFIG);

	// Read config file and apply first
	if (CONFIG_PATH && fs.existsSync(CONFIG_PATH)) {
		const fileContent = fs.readFileSync(CONFIG_PATH, "utf-8");
		const fileConfig = JSON.parse(fileContent);
		mergeObjects(config, fileConfig);
	} else {
		logger.warn(`Could not find config file at ${CONFIG_PATH}`);
	}

	// Walk over the config and use env vars
	walkConfigAndApplyEnv(config);

	return config;
}

module.exports = { loadConfig };
