// ---------------------------------
// Log system
// ---------------------------------
// Custom Log system
/**
 * @author Bitstudios <support@bitstudios.org>
 */

//requires

const { Console } = require("console");
var fs = require("fs")

//code

/**
* @param {string} [Name] - Log name
* @param {string} [Path] - Path to log file
* @param {boolean} [date] - Add date to log
* @param {number} [SaveInterval] - Interval to save
*/
class log {
    CurrentLog = [];
    Name = ""
    Path = ""
    date = false
    SaveInterval = 0
    SaveLoopInterval = {}
    constructor(Name = "", Path = "./log.txt", date = false, SaveInterval = 10000) {
        this.Name = Name
        this.Path = Path
        this.date = date
        this.SaveInterval = SaveInterval
    }
    startSave(){
        this.SaveLoopInterval = setInterval(() => {
            if (this.CurrentLog == []) {

            } else {
                var tmpPath = this.Path.replace("web/", "web/"+ new Date().toLocaleDateString().replace(/\//g,"_") + "/")
                if(!fs.existsSync(tmpPath.replace(/\/[A-z]*\.txt/g,""))){
                    fs.mkdirSync(tmpPath.replace(/\/[A-z]*\.txt/g,""))
                }
                fs.appendFileSync(this.Path.replace("web/", "web/"+ new Date().toLocaleDateString().replace(/\//g,"_") + "/"), this.CurrentLog.join(`
`),"utf-8")
                this.CurrentLog = []
            }
        }, this.SaveInterval);
    }
    stopSave(){
        clearInterval(this.SaveLoopInterval)
    }
    /**
    * @param {string} [Input] - What to log
    */
    log(Input = "") {
        var ThisLog = ""

        if(this.date == true){
            ThisLog =`${this.Name} | ${Date.now()} : ${Input}`
        }else{
            ThisLog =`${this.Name} : ${Input}`
        }
        this.CurrentLog.push(ThisLog)
        console.log(ThisLog)
    }
}

//exports

module.exports = {
    log: log
}