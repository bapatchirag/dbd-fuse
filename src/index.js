#!/bin/env node
const Fuse = require('fuse-native');
const fuseops = require('./fsops');
const path = require('path');
const FSError = require('./misc/FSError');
const { O_RDONLY } = require('constants');
const fsops = require('./fsops');
const argv = require('yargs/yargs')(process.argv.slice(2)).argv;
const {validURL}= require('./misc/urlParser')

try {
    const dotenv = require('dotenv');
    dotenv.config();
} catch {
    console.log('I> did not set env vars');
}

/**
 * credentials for processing
 */
let creds = {
    email: process.env.COUSCOUS_FUSEEMAIL,
    pwd: process.env.COUSCOUS_FUSEPWD,
    directory: process.env.COUSCOUS_DMOUNT,
    url: validURL(process.env.COUSCOUS_URL)
};

// console.log(argv.o)
const usableArgs = argv.o||"";
creds.directory = (argv._ && argv._[0]) ||creds.directory
if (usableArgs) {
    const args = usableArgs.split(',')
    const argdiv = args.map(e=>e.split('='))

    const emailbit = argdiv.find(e=>e[0]==='username')
    const pwdbit = argdiv.find(e=>e[0]==='password')
    const urlbit = argdiv.find(e=>e[0]==='url')
    creds.email = (emailbit && emailbit[1])||creds.email
    creds.pwd = (pwdbit && pwdbit[1])||creds.pwd
    creds.url = (urlbit && validURL(urlbit[1]))|| creds.url
}


// console.log(creds)

const ops = {
    readdir: (path, cb) => {
        // console.log('I>readdir', path);
        fuseops
            .readdir(path)
            .then(response => {
                const { contents, contexts } = response;
                return process.nextTick(cb, 0, contents /*contexts*/);
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
    getattr: (path, cb) => {
        console.log('I>getattr', path);
        fuseops
            .getattr(path)
            .then(response => {
                // console.log(response)
                return process.nextTick(cb, 0, response);
            })
            .catch(err => {
                console.log('I>getattr error',path);
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    open: (path, flags, cb) => {
        console.log('I>open(%s, %d)', path, flags);
        fuseops
            .open(path, flags)
            .then(response => {
                console.log('I>opened with fd',response)
                return process.nextTick(cb, 0, response);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    release: (path, fd, cb) => {
        console.log('I>close(%s, %d)', path, fd);
        fuseops
            .close(path, fd)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    chmod: (path, mode, cb) => {
        console.log('I>chmod(%s, %d)', path, mode);
        fuseops
            .chmod(path, mode)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    read: (path, fd, buf, len, pos, cb) => {
        console.log('I>read(%s,%d)', path, fd);
        fuseops
            .read(path, fd, buf, len, pos)
            .then(e => {
                return process.nextTick(cb, e);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    create: (path, mode, cb) => {
        console.log('I>create(%s,%d)', path, mode);
        fuseops
            .create(path, mode)
            .then((val) => {
                return process.nextTick(cb, 0,val);
            })
            .catch(err => {
                console.log('Create threw an error')
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
        // return process.nextTick(cb,Fuse.EHOSTUNREACH)
    },
    utimens: (path, atime, mtime, cb) => {
        console.log('I>utime',path,atime,mtime);
        fuseops.utimens(path,atime,mtime).then(()=>{
            return cb(0);
        }).catch(err=>{
            if (err instanceof FSError) {
                return process.nextTick(cb, err.errno);
            } else {
                return process.nextTick(cb, Fuse.EFAULT);
            }
        })
        //dummy function
        // console.log('I>changetimes(faking)', path, atime, mtime,typeof atime, typeof mtime);
        // return process.nextTick(cb, 0);
    },
    mkdir: (path, mode, cb) => {
        console.log('I>mkdir(%s,%d)', path, mode);
        fuseops
            .mkdir(path, mode)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    rename: (src, dest, cb) => {
        console.log('I>rename(%s,%s)', src, dest);
        fuseops
            .rename(src, dest)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    rmdir: (pathstr, cb) => {
        console.log('I>rmdir(%s)', pathstr);
        fuseops
            .rmdir(pathstr)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    write: (path, fd, buffer, length, position, cb) => {
        /**
         * @type {Buffer}
         */
        const mybuf = buffer;

        console.log('I>write',path, fd, buffer, length, position);
        fuseops
            .write(fd, buffer, length, position, cb)
            .then(res => {
                console.log('wrote', res);
                return process.nextTick(cb, res);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
        // return process.nextTick(cb, 0);
    },
    unlink: (path, cb) => {
        console.log('I>unlink', path);

        fuseops
            .unlink(path)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
    flush: (path, fd, cb) => {
        //foobar
        // console.log('I>flush',path);
        return cb(0);
    },
    releasedir: (path, fd, cb) => {
        return cb(0);
    },
    opendir: (path, flags, cb) => {
        return cb(0, 42);
    },
    // getxattr: (path, name, position, cb) => {
    //     console.log('I>getxattr', path,name);
    //     return cb(0, '');
    // },
    truncate: (path, size, cb) => {
        // console.log('I>Truncate', path, size);
        fuseops
            .truncate(path, size)
            .then(() => {
                return process.nextTick(cb, 0);
            })
            .catch(err => {
                if (err instanceof FSError) {
                    return process.nextTick(cb, err.errno);
                } else {
                    return process.nextTick(cb, Fuse.EFAULT);
                }
            });
    },
};

const fuse = new Fuse(creds.directory, ops, {
    debug: process.env.FUSEDEBUG === 'true',
    displayFolder: true,
});

/**
 * Mount FUSE
 */
fuseops
    .init(creds.email,creds.pwd,creds.url)
    .then(() => {
        fuse.mount(err => {
            if (err) {
                throw err;
            }

            console.log('FS mounted at ' + fuse.mnt);
        });
    })
    .catch(err => {
        if (err instanceof FSError) {
            console.log('could not mount with error ', err.errno);
            process.exit(1);
            // return process.nextTick(cb, err.errno);
        } else {
            console.log('E>could not mount, general error:',  err.message || err.name || err.msg || err);
            process.exit(1);
            // return process.nextTick(cb, Fuse.EFAULT);
        }
    });

/**
 * Unmount FUSE on SIGINT
 */
process.once('SIGINT', () => {
    fuse.unmount(err => {
        if (err) {
            console.log(
                '\nFS at ' + fuse.mnt + ' could not be unmounted: ' + err
            );
            return;
        }
        fuseops.deinit().then(() => {
            console.log('I>Logged out');
        });
        console.log('\nFS at ' + fuse.mnt + ' successfully unmounted');
    });
});
