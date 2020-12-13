const assert = require('assert')
/**
 * 
 * @param {string} input 
 */
module.exports.validURL = function validURL(input){
    const url = new URL(input)
    assert(url.protocol === "http:" || url.protocol === "https:","Need to include http or https");

    return url.origin;
}
