// This file wraps and returns the data
// if error, it wraps and throws the appropriate callback error

const { config } = require('process');
const FSError = require('./misc/FSError');
const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const tough = require('tough-cookie');
const { ECONNREFUSED, EPERM } = require('fuse-native');

// axios does not store cookies, we have to do it :). Using cookie jar
axiosCookieJarSupport(axios);
axios.defaults.withCredentials = true;
const cookieJar = new tough.CookieJar();
axios.defaults.jar = cookieJar;

// TODO replace with config

const baseURL = 'http://localhost:8081';
// axios.create cannot have have ports mentioned
// const axiosConfig = axios.create({
//     baseURL: 'http://localhost:8081/',
//     timeout: 400,
//     timeoutErrorMessage: 'Request timed out',
// });

/**
 * @typedef {{ok:boolean, status:string, data:Object}} response
 */

/**
 * Reads directory from path given
 * @param {string} path Directory path to be read
 * @returns {response} Response object
 */
const readdir = async path => {
    try {
        const response = await axios.post(baseURL + '/api/folder/read', {
            path: path,
        });

        return {
            contents: response.data.contents//.map(e =>e.name) //,
            /*contexts: response.data.contents.map(e => {
                return {
                    mtime: new Date(),
                    atime: new Date(),
                    ctime: new Date(),
                    nlink: 1,
                    size: 42,
                    mode: ((e.type === 'folder')? 0o40000:0o100000) + e.permissions,
                    uid: process.getuid ? process.getuid() : 0,
                    gid: process.getgid ? process.getgid() : 0,
                };
            }),*/
        };
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
};

/**
 *
 * @param {string} path
 */
async function getattr(path) {
    try {
        const response = await axios.post(baseURL + '/api/general/getattr', {
            path: path,
        });
        // console.log(response.data);
        const { type, permissions,size } = response.data.stat;
        return {
            mtime: new Date(),
            atime: new Date(),
            ctime: new Date(),
            nlink: 1,
            size: response.data.stat.size===undefined?42:response.data.stat.size,
            mode: ((type === 'folder') ? 0o40000:0o100000) + permissions,
            uid: process.getuid ? process.getuid() : 0,
            gid: process.getgid ? process.getgid() : 0,
        };
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

async function open(path, flags){
    try {
        const response = await axios.post(baseURL + '/api/file/open', {
            path,
            operation: flags
        });
        const fd = response.data.result;
        return parseInt(fd);
    } catch (err) {
        // console.log(err.response)
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

async function close(path, fd){
    try {
        const response = await axios.post(baseURL + '/api/file/close', {
            path,
            fd
        });
        
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}

async function chmod(path, mode){
    try {
        const response = await axios.post(baseURL + '/api/general/chmod', {
            path,
            permissions: mode
        });
        console.log(response.data);
        const change = parseInt(response.data.changed);
        if(change<1){
            throw new FSError('no perm',EPERM)
        }
        return change;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else if((err && err.response && err.response.status) === 401){
            throw new FSError('No perms', EPERM);
        }else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}



/**
 * Do not include this function as an operation. This is meant to login and receive the cookie.
 */
async function init() {
    try {
        const response = await axios.post(baseURL + '/api/auth/login', {
            email: process.env.FUSEEMAIL,
            pwd: process.env.FUSEPWD,
        });
        console.log('I>Login successful');
    } catch (err) {
        if ((err && err.response && err.response.status) === 403) {
            throw new FSError('undefined perms', EPERM);
        }
    }
}

// read a file. it will also write to the buffer buf before returning
async function read(path,fd,buf,len,pos){
    try{
        console.log('tried to read',fd,len,pos);
        const response = await axios.post(baseURL+ '/api/file/read',{
            fd,
            length:len,
            position:pos
        })
        buf.write(response.data);
        console.log('R>Size:',response.data.length);
        return response.data.length


    }catch (err) {
        // console.log(err.response);
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else if((err && err.response && err.response.status) === 401){
            throw new FSError('No perms', EPERM);
        }else {
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
async function create(path,mode){
    try {
        const response = await axios.post(baseURL + '/api/file/create', {
            path,
            permissions: mode
        });
        // console.log(response.data);
        const newId = parseInt(response.data.inserted);
        if(isNaN(newId)||newId<1){
            throw new FSError('no perm',EPERM)
        }
        return newId;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else if((err && err.response && err.response.status) === 401){
            throw new FSError('No perms', EPERM);
        }else {
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
async function mkdir(path,mode){
    try {
        const response = await axios.post(baseURL + '/api/folder/create', {
            path,
            permissions: mode
        });
        // console.log(response.data);
        const newId = parseInt(response.data.inserted);
        if(isNaN(newId)||newId<1){
            throw new FSError('no perm',EPERM)
        }
        return newId;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else if((err && err.response && err.response.status) === 401){
            throw new FSError('No perms', EPERM);
        }else {
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
async function rename(src,dest){
    try {
        const response = await axios.post(baseURL + '/api/general/rename', {
            src,dest
        });
        const change = parseInt(response.data.changed);
        if(change<1){
            throw new FSError('no perm',EPERM)
        }
        return change;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else if((err && err.response && err.response.status) === 401){
            throw new FSError('No perms', EPERM);
        }else {
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
async function rmdir(pathStr){
    try {
        const response = await axios.post(baseURL + '/api/folder/remove', {
            path:pathStr
        });
        const change = parseInt(response.data.changed);
        if(change<1){
            throw new FSError('no perm',EPERM)
        }
        return change;
    } catch (err) {
        // need to throw errors here, so they are caught upstream by the readdir function
        if ((err && err.response && err.response.status) === 404) {
            throw new FSError('Folder not found');
        } else if ((err && err.response && err.response.status) === 403) {
            throw new FSError('No perms', EPERM);
        } else if((err && err.response && err.response.status) === 401){
            throw new FSError('No perms', EPERM);
        }else {
            console.log('E>', err.message || 'error');
            throw new FSError('General error', ECONNREFUSED);
            //return { ok: false, status: 'Undefined' };
        }
    }
}


/**
 * Do not include this function as an operation. This is meant to clean up the cookie and logout.
 */
async function deinit() {
    try {
        const response = await axios.post(baseURL + '/api/auth/logout', {
            email: process.env.FUSEEMAIL,
            pwd: process.env.FUSEPWD,
        });
    } catch(e) {
        console.error('E> failed to logout');
    }
}

module.exports = { readdir, init, getattr,open,close,chmod,read,create,mkdir,rename, rmdir,deinit };
