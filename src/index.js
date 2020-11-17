const Fuse = require('fuse-native')
const fuseops = require('./fsops')

const ops = {
    readdir: (path, cb) => {
        console.log('readdir on ' + path)
        const readdirResponse = fuseops.readdir(path)
        if(readdirResponse.ok === true) {
            return process.nextTick(cb, 0, readdirResponse.contents)
        }
        else {
            return process.nextTick(cb, Fuse.ENOENT)
        }
    }
}