//@ts-check
/**
 * @file This module wraps all requests, and returns requests.
 * Errors are processed and returned according to the status codes received.
 * @author Atreya Bain 
 */


const { config } = require('process');
const FSError = require('./misc/FSError');
const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const { ECONNREFUSED, EACCES,EPERM } = require('fuse-native');
const jwt = require('jsonwebtoken')

// axios does not store cookies, we have to do it :). Using cookie jar
axiosCookieJarSupport(axios);
axios.defaults.withCredentials = true;
const cookieJar = new tough.CookieJar();
axios.defaults.jar = cookieJar;


/**
 * global Settings configuration
 */
const globalSettings = {uid:null,baseLocation:null}


/**
 * @typedef {{ok:boolean, status:string, data:Object}} response
 */

/**
 * Reads directory from path given
 * @param {string} path Directory path to be read
 * @returns {Promise<{contents:string[]}>} Response object
 */
async function readdir(path) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/folder/read', {
            path: path,
        });

        return {
            contents: response.data.contents,
        };
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
};

/**
 * Get information on file/folder
 * @param {string} path
 */
async function getattr(path) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/general/getattr', {
            path: path,
        });
        // console.log('MyDate',(response.data.stat.mtime&& new Date(response.data.stat.mtime))|| new Date());
        const { type, permissions, size, } = response.data.stat;
        return {
            mtime: (response.data.stat.mtime&& new Date(response.data.stat.mtime))|| new Date(),
            atime: (response.data.stat.atime&& new Date(response.data.stat.atime))|| new Date(),
            ctime: (response.data.stat.ctime&& new Date(response.data.stat.ctime))|| new Date(),
            nlink: 1,
            size:
                response.data.stat.size === undefined
                    ? 42
                    : response.data.stat.size,
            mode: (type === 'folder' ? 0o40000 : 0o100000) + permissions,
            uid: (globalSettings.uid===response.data.stat.uid && process.getuid) ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0,
        };
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * open file and return fd
 * @param {string} path location to readdir
 * @param {number} flags mode to open in
 */
async function open(path, flags) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/file/open', {
            path,
            operation: flags,
        });
        const fd = response.data.result;
        return parseInt(fd);
    } catch (err) {
        // console.log(err.response)
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * close file descriptor and return result
 * @param {string} path location
 * @param {number} fd  file descriptor
 */
async function close(path, fd) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/file/release', {
            path,
            fd,
        });
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Change permissions of file/folder
 * @param {string} path path
 * @param {path} mode new permissions
 */
async function chmod(path, mode) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/general/chmod', {
            path,
            permissions: mode,
        });
        console.log(response.data);
        const change = parseInt(response.data.changed);
        if (change < 1) {
            throw new FSError('no perm', EACCES);
        }
        return change;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Do not include this function as an operation. This is meant to login and receive the cookie.
 * Do not wrap with try catch
 * @param {string} email
 * @param {string} pwd
 * @param {string} location
 */
async function init(email,pwd,location) {
    //set the url
    globalSettings.baseLocation = location;
    const response = await axios.post(globalSettings.baseLocation + '/api/auth/login', {
        email,
        pwd,
    });
    const token = (await cookieJar.getCookieString(globalSettings.baseLocation)).split('=')[1]
    const tokenContents = jwt.decode(token,{json:true})
    // console.log('tokenContents);
    console.log('I>Login successful with token',token);
    globalSettings.uid = tokenContents.uid;
}


/**
 * Read a portion of a file descriptor
 * @param {string} path path string (not used)
 * @param {number} fd file descriptor
 * @param {Buffer} buf Buffer to write answer to
 * @param {number} len amount required to read
 * @param {number} pos position to read from
 * @returns {Promise<number>} the number of bytes read
 */
async function read(path, fd, buf, len, pos) {
    try {
        // console.log('tried to read', fd, len, pos);
        const response = await axios.post(globalSettings.baseLocation + '/api/file/read', {
            fd,
            length: len,
            position: pos,
        });
        // Buffer.from(response.data.result)
        Buffer.from(response.data.result).copy(buf);
        // buf.copy()
        // buf.write();
        // console.log("i> Read data",response.data.result.length)
        // console.log('R>Size:', response.data.result.length);
        return response.data.result.length;
    } catch (err) {
        // console.log(err.response);
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Create file
 * @param {string} path
 * @param {number} mode
 */
async function create(path, mode) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/file/create', {
            path,
            permissions: mode,
        });
        // console.log(response.data);
        const newfd = parseInt(response.data.result);
        if (isNaN(newfd) || newfd < 1) {
            throw new FSError('no perm', EACCES);
        }
        return newfd;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Create file
 * @param {string} path
 * @param {number} mode
 */
async function mkdir(path, mode) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/folder/create', {
            path,
            permissions: mode,
        });
        // console.log(response.data);
        const newId = parseInt(response.data.inserted);
        if (isNaN(newId) || newId < 1) {
            throw new FSError('no perm', EACCES);
        }
        return newId;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Rename file
 * @param {string} src
 * @param {string} dest
 */
async function rename(src, dest) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/general/rename', {
            src,
            dest,
        });
        const change = parseInt(response.data.changed);
        if (change < 1) {
            throw new FSError('no perm', EACCES);
        }
        return change;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Rename file
 * @param {string} pathStr
 */
async function rmdir(pathStr) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/folder/remove', {
            path: pathStr,
        });
        const change = parseInt(response.data.changed);
        if (change < 1) {
            throw new FSError('no perm', EACCES);
        }
        return change;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Write a file
 * @param {number} fd
 * @param {Buffer} buffer
 * @param {number} length
 * @param {number} position
 * @return {Promise<number>}
 */
async function write(fd, buffer, length, position) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/file/write', {
            fd,
            buffer: [...buffer],
            length,
            position,
        });
        // console.log('Wrote data',response.data);
        return response.data.result;
    } catch (err) {
        console.log('I>Write error',err);
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 * Unlink/Remove File
 * @param {string} path
 */
async function unlink(path) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/file/unlink', {
            path,
        });
        console.log(response.data);
        const change = parseInt(response.data.result);
        // if (change < 1) {
        //     throw new FSError('no perm', EACCES);
        // }
        return change;
    } catch (err) {
        console.log(err.response.status);
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

/**
 *  Truncate a file to a specified size
 * @param {string} path
 * @param {number} size
 */
async function truncate(path, size) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/file/truncate', {
            path,
            size,
        });
        // console.log(response.data);
        const change = parseInt(response.data.result);
        // if (change < 1) {
        //     throw new FSError('no perm', EACCES);
        // }
        return change;
    } catch (err) {
        console.log(err.response.status);
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}


/**
 * change times on a file/folder
 * @param {string} path 
 * @param {number} atime 
 * @param {number} mtime 
 */
async function utimens(path,atime,mtime) {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/general/utime', {
            path,
            atime,
            mtime
        });
        console.log(response.data);
        const change = parseInt(response.data.result);
        // if (change < 1) {
        //     throw new FSError('no perm', EACCES);
        // }
        return change;
    } catch (err) {
        console.log(err.response.status);
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EACCES);
        } else if ((err && err.response && err.response.status) === 401) {
            throw new FSError('No perms', EACCES);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}


/**
 * Not an operation.
 * Cleans up cookies and logout.
 */
async function deinit() {
    try {
        const response = await axios.post(globalSettings.baseLocation + '/api/auth/logout', {
            email: process.env.FUSEEMAIL,
            pwd: process.env.FUSEPWD,
        });
    } catch (e) {
        console.error('E> failed to logout');
    }
}

module.exports = {
    readdir,
    init,
    getattr,
    open,
    close,
    chmod,
    read,
    create,
    mkdir,
    rename,
    rmdir,
    write,
    unlink,
    utimens,
    truncate,
    deinit,
};
