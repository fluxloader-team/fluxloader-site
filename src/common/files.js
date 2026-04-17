const fs = require("fs");
const ejs = require("ejs");

function getTemplateFile(name) {
	const tpl = globalThis.templates[name];
	if (!tpl) throw new Error(`Missing template: ${name}`);

	if (globalThis.config.dev?.hotReload) {
		return { content: fs.readFileSync(tpl.path, "utf8"), path: tpl.path };
	}

	return tpl;
}

function getPublicFile(name) {
	const file = globalThis.public[name];
	if (!file) return null;

	if (globalThis.config.dev?.hotReload) {
		return { content: fs.readFileSync(file.path), path: file.path };
	}

	return file;
}

function customInclude(file, data) {
	// Normalize key like './header' -> 'header.ejs'
	let name = file.replace(/^\.\//, "");
	if (!name.endsWith(".ejs")) name += ".ejs";

	const tpl = getTemplateFile(name);

	return ejs.render(tpl.content, data, { filename: tpl.path });
}

module.exports = { customInclude };

module.exports = {
	getTemplateFile,
	getPublicFile,
	customInclude,
};
