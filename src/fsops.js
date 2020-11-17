const { config } = require('process')

const axios = require('axios').default

const axiosConfig = axios.create({
    baseURL: "http://localhost:3000",
    timeout: 400,
    timeoutErrorMessage: "Request timed out"
})

/**
 * @typedef {{ok:boolean, contents:Array<string>}} readdirRes
 * @typedef {{ok:boolean, status:string}} badResponse
 */

/**
 * Reads directory from path given
 * @param {string} path Directory path to be read
 * @returns {readdirRes | badResponse} Response object
 */
const readdir = async (path) => {
    try {
        const response = await axios.post("/api/folder/read", { path:path }, axiosConfig)
        return { ok:true, contents:response.data.contents}
    }
    catch(err) {
        if(err.status == 404) {
            return { ok:false, status:"Folder not found"}
        }
        else {
            return { ok:false, status:"Undefined"}
        }
    }
}

module.exports = {readdir}