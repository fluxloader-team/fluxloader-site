const Module = require("module");
var originalLoad = Module._load;
const fs = require("fs").promises;

Module.asyncLoad = async function (request, parent, isMain) {
	return new Promise((resolve, reject) => {
		resolve(originalLoad.call(this, request, parent, isMain));
	});
};

global.asyncRequire = async function (request) {
	return Module.asyncLoad(request, module.children, false);
};

asyncRequire("./index.js");
Module.builtinModules;
