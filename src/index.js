#!/bin/env node
const Fuse = require('fuse-native');
const fuseops = require('./fsops');
const path = require('path');
const FSError = require('./misc/FSError');

try {
    const dotenv = require('dotenv');
    dotenv.config();
} catch {
    console.log('I> did not set env vars');
}

console.log(process.argv);

let pathToMount = process.argv[2] || './mnt';

const ops = {
    readdir: (path, cb) => {
        console.log('I>readdir', path);

        fuseops
            .readdir(path)
            .then(response => {
                
                return process.nextTick(cb, 0, response.contents,response.contexts);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
                // console.log(err)
                // return process.nextTick(cb, Fuse.ENOENT)
            });
    },
};

const fuse = new Fuse('./mnt', ops, { debug: true, displayFolder: true });

/**
 * Mount FUSE
 */
fuseops.init().then(()=>{
    fuse.mount(err => {
        if (err) {
            throw err;
        }
    
        console.log('FS mounted at ' + fuse.mnt);
    });
}).catch(err=>{
    if (err instanceof FSError) {
        console.log('could not mount with error ',err.errno);
        process.exit(1)
        // return process.nextTick(cb, err.errno);

    } else {
        console.log('E>could not mount, general error:',err);
        process.exit(1)
        // return process.nextTick(cb, Fuse.EFAULT);
    }
})



/**
 * Unmount FUSE on SIGINT
 */
process.once('SIGINT', () => {
    fuse.unmount(err => {
        if (err) {
            console.log(
                '\nFS at ' + fuse.mnt + ' could not be unmounted: ' + err
            );
        }

        console.log('\nFS at ' + fuse.mnt + ' successfully unmounted');
    });
});

