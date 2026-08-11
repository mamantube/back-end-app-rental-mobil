import message from "../../utils/message.js";
import transactionModel from "../../models/transaction.js";
import { Types } from "mongoose";


/**
 * 
 * @typedef {import("express").Request} ExpressRequest 
 * @typedef {import("express").Response} ExpressResponse
 */

/**
 * 
 * @param {ExpressRequest} req 
 * @param {ExpressResponse} res 
 */

export default async function (req, res) {
    try {
        const user_id = req.params._id;

        if (!Types.ObjectId.isValid(user_id)) {
            return message(res, 422, "User id Tidak valid")
        }
        
        const detailTransaction = await transactionModel.find({
            
            user_id: new Types.ObjectId(user_id),
            deleted_at: null,
        })
        .populate("product_ids")
        .sort({ created_at: -1 });

        return message(res, 200, "Data Transaksi", detailTransaction)



        const detail = await transactionModel.aggregate([
            {
                $match: {
                    _id: new Types.ObjectId(_id),
                    deleted_at: null,
                }
            },
            {
                $lookup: {
                    from: "users",
                    foreignField: "_id",
                    localField: "user_id",
                    as: "user_detail"
                },
            },
            {
                $unwind: "$user_detail",
            },
            {
                $lookup: {
                    from: "products",
                    foreignField: "_id",
                    localField: "product_ids",
                    as: "product_detail"
                }
            },
            {
                $project: {
                    "user_detail.password": 0,
                }
            },
        ]);

        if (!detail.length)
            return message(res, 404, "Transaksi tidak ditemukan")
        message(res, 200, "Detail transaksi", detail[0])
    } catch (error) {
        message(res, 500, error?.message || "Server internal error")
    }
}