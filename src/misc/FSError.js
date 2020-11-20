const { ENOENT } = require('fuse-native');

class FSError extends Error {
    constructor(message, errno = ENOENT) {
        super(message);
        this._errno = errno;
    }

    get errno(){
        return this._errno;
    }
}
module.exports = FSError;