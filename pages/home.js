/**
 * @file home.js
 * @description Handles the home page of the mod site.
 * This module renders the home page.
 */

var ejs = require("ejs");

/**
 * @namespace home
 * @memberof module:web
 */

module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:web.home
	 */
	paths: ["", "/", "/home"],

	/**
	 * Handles HTTP requests for the home page.
	 *
	 * This function renders an HTML page using EJS templates and provides it as the response.
	 *
	 * @function run
	 * @memberof web.home
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends the error response.
	 */
	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.templates["base.ejs"], { data: [globalThis.templates["basicheaders.html"], globalThis.templates["home.html"]] }));
	},
};
