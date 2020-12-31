const { config } = require('process');
const FSError = require('./misc/FSError');
const axios = require('axios').default;
const axiosCookieJarSupport = require('axios-cookiejar-support').default;
const formData = require('form-data');
const tough = require('tough-cookie');
const { ECONNREFUSED, EPERM } = require('fuse-native');
require('dotenv').config();

// axios does not store cookies, we have to do it :). Using cookie jar
axiosCookieJarSupport(axios);
axios.defaults.withCredentials = true;
const cookieJar = new tough.CookieJar();
axios.defaults.jar = cookieJar;
const baseURL = 'http://localhost:8081';

console.log('ENV EMAIL', process.env.FUSEEMAIL);

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

async function open(path, flags) {
    try {
        const response = await axios.post(baseURL + '/api/file/open', {
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
            throw new FSError('No perms', EPERM);
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
 */
async function write(fd, buffer, length, position) {
    const fdata = new formData();
    fdata.append('fd', fd);
    fdata.append('length', length);
    fdata.append('position', position);
    fdata.append('buffer', buffer);

    // fdata.append('length',length.toString());
    const response = await axios.post(
        baseURL + '/api/file/write',
        fdata.getBuffer(),
        {
            headers: { ...fdata.getHeaders() },
        }
    );
}

/**
 * Write a file
 * @param {number} fd
 * @param {Buffer} buffer
 * @param {number} length
 * @param {number} position
 */
async function write2(fd, buffer, length, position){
    return axios.post(baseURL + '/api/file/write',{
        fd,
        buffer:[...buffer],
        length,
        position
    })
}


// async function write3(fd, buffer, length, position)

async function close(path, fd) {

    const response = await axios.post(baseURL + '/api/file/release', {path,fd});
}

const myFilePath = '/tello.txt';

(async function main() {
    let closableFd;
    try {
        console.log('start');
        await init();

        const myBuf = Buffer.from([
            0x61,
            0x6c,
            0x69,
            0x68,
            0x67,
            0x61,
            0x73,
            0x73,
            0x0a,
        ]);
        // 32769
        const fd = await open(myFilePath, 32769);
        closableFd = fd;
        const response = await write2(fd, myBuf, 9, 0);
        console.log(response.data)
        console.log(myBuf, fd);
        await close(myFilePath, fd);
        closableFd = null;
    } catch (e) {
        if (closableFd) {
            await close(myFilePath, closableFd);
        }
        console.log('Error', e);
    }
})();
