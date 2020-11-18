const Fuse = require('fuse-native')
const fuseops = require('./fsops')

const ops = {
    readdir: (path, cb) => {
        console.log('readdir on ' + path)
        const readdirResponse = fuseops.readdir(path)
        if(readdirResponse.ok === true) {
            return process.nextTick(cb, 0, readdirResponse.data.contents)
        }
        else {
            return process.nextTick(cb, Fuse.ENOENT)
        }
    }
}

const fuse = new Fuse('./mnt', ops, { debug:true, displayFolder:true})

/**
 * Mount FUSE
 */
fuse.mount(err => {
    if(err) {
        throw err
    }

    console.log('FS mounted at '+fuse.mnt)
})

/**
 * Unmount FUSE on SIGINT
 */
process.once('SIGINT', () => {
    fuse.unmount(err => {
        if(err) {
            console.log('\nFS at '+fuse.mnt+' could not be unmounted: '+err)
        }
        
        console.log('\nFS at '+fuse.mnt+' successfully unmounted')
    })
})