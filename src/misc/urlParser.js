const assert = require('assert');
// const { URL } = require('url');
/**
 *
 * @param {string} input
 */
module.exports.validURL = function validURL(input) {
    /**
     * @type {URL}
     */
    let url
    try {
        url = new URL(input);
    } catch (e) {
        // console.log(e)
        throw new Error('Enter valid URL');
    }
    assert(
        url.protocol === 'http:' || url.protocol === 'https:',
        'Need to include http or https'
    );

    return url.origin;
};
