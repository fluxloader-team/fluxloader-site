/**
 * @file upload.js
 * @description Handles the upload page of the mod list site.
 * This file renders the upload page.
 */

var ejs = require("ejs");

/**
 * @namespace upload
 * @memberof module:web
 */
module.exports = {
	/**
	 * The paths that use this module.
	 * @type {Array<string>}
	 * @memberof module:web.upload
	 */
	paths: ["/upload"],
	/**
	 * Handles GET requests for the upload page.
	 *
	 * This function generates an HTML page using EJS templates and provides it as the response.
	 *
	 * @function run
	 * @memberof module:web.upload
	 * @param {IncomingMessage} req - The HTTP request object.
	 * @param {ServerResponse} res - The HTTP response object.
	 *
	 * @example
	 * // Example usage when visiting the '/upload' path:
	 * fetch('/upload')
	 *    .then(response => response.text())
	 *    .then(html => {
	 *        document.body.innerHTML = html;
	 *    });
	 */

	run: function (req, res) {
		res.writeHead(201, { "Content-Type": "text/html" });
		res.end(ejs.render(globalThis.Templates["base.ejs"], { data: [globalThis.Templates["basicheaders.html"], globalThis.Templates["upload.html"]] }));
	},
};
