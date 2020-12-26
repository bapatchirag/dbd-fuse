const { ENOENT } = require('fuse-native');

/**
 * Standard File system error
 */
class FSError extends Error {
    /**
     * 
     * @param {string} message Message to display if required
     * @param {number} errno Error type
     */
    constructor(message, errno = ENOENT) {
        super(message);
        console.log("E>FS ERROR",message,errno);
        this._errno = errno;
    }

    /**
     * Error code
     */
    get errno(){
        return this._errno;
    }
}
module.exports = FSError;