import Jwt from "jsonwebtoken";
import userModel from "../models/users.js";
import message from "../utils/message.js";


/**
 * 
 * @typedef {import("express").Request} ExpressRequest 
 * @typedef {import("express").Response} ExpressResponse
 * @typedef {import("express").NextFunction} ExpressNext
 */

/**
 * 
 * @param {ExpressRequest} req 
 * @param {ExpressResponse} res 
 * @param {ExpressNext} next
 */


export function authorization (req, res, next) {
    const token = req.headers;

    message(res, 200, "token", token);
}