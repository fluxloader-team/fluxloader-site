/**
 * @file admin.js
 * @description Loads the first admin without any data
 */

var ejs = require("ejs");

/**
 * @namespace admin
 * @memberof module:web
 */

module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:web.admin
	 */

	paths: ["/admin"],
	/**
	 * Handles HTTP requests for the admin page.
	 *
	 * @function run
	 * @memberof web.admin
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @returns {Promise<void>} Sends the error response.
	 */
	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.templates["base.ejs"], { data: [globalThis.templates["basicheaders.html"], globalThis.templates["admin.html"]] }));
	},
};
