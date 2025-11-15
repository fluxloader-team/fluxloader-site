const ejs = require("ejs");

function includeFromMemory(file, data) {
	// Normalize key like './header' -> 'header.ejs'
	let name = file.replace(/^\.\//, "");
	if (!name.endsWith(".ejs")) name += ".ejs";

	const tpl = globalThis.templates[name];
	if (!tpl) throw new Error(`Missing in-memory template: ${name}`);

	return ejs.render(tpl.content, data, { filename: tpl.path });
}

module.exports = { includeFromMemory };
