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
            contents: response.data.contents.map(e => e.name),
            contexts: response.data.contents.map(e => {
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
            }),
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
        console.log(response.data);
        const { type, permissions } = response.data.stat;
        return {
            mtime: new Date(),
            atime: new Date(),
            ctime: new Date(),
            nlink: 1,
            size: 42,
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
        console.error('E> failed to logout:',e);
    }
}

module.exports = { readdir, init, getattr,open,close,deinit };
