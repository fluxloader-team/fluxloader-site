/**
 * @file admin.js
 * @description Loads the admin page without any data
 */

var colors = require('colors');
var ejs = require('ejs')
var Utils = require('./../utils')

const log = new Utils.log.log("Sandustry.web.pages.admin", "./sandustry.web.main.txt", true);

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
    paths: ['/admin'],
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
    run: function (req,res){
        res.writeHead(201, {"Content-Type": "text/html"})
        res.end(ejs.render(globalThis.Templates["base.ejs"], { data: [globalThis.Templates["basicheaders.html"],globalThis.Templates["admin.html"]] }))
    }
}