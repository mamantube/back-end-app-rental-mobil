import message from "../../utils/message.js";
import transactionModel from "../../models/transaction.js";
import { z } from "zod";
import validation from "../../utils/validation.js";
import { Types } from "mongoose";
import { nanoid } from "nanoid";
import userModel from "../../models/users.js";
import productModel from "../../models/products.js";
import midtransClient from "midtrans-client";
import { MIDTRANS_CLIENT_KEY, MIDTRANS_SERVER_KEY} from "../../utils/unpublished.js"


const schemaValidation = z.object({
    // gross_amount: z.number().int().positive(),
    rental_duration: z.object({
        start_date: z.coerce.date(),
        end_date: z.coerce.date(),
    }),
    user_id: z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid user ID"),
    product_ids: z.array(
        z.string().refine((value) => Types.ObjectId.isValid(value), "Invalid product ID")
    ).refine((value) => value.length, "Product id is required")
})
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
        const body = req.body;

        const checkValidation = validation(schemaValidation, body);
        
        if (!checkValidation.success)
            return message(res, 422, "Validasi error", {
                errors: checkValidation.errors,
            });
        
        const startDate = new Date(checkValidation.data.rental_duration.start_date);
        const endDate = new Date(checkValidation.data.rental_duration.end_date);
        const diffTime = endDate.getTime() - startDate.getTime();
        const rentalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;


            
            const findUserId = await userModel.findOne({ _id: checkValidation.data.user_id, deleted_at: null });
            
            if (!findUserId)
            return message(res, 404, "User tidak ditemukan");
        
        const findProductId = await productModel.find({ _id: { $in: checkValidation.data.product_ids }});
        
        if (!findProductId.length)
            return message(res, 404, "Produk tidak ditemukan");
    
        if (findProductId.length !== checkValidation.data.product_ids.length)
            return message(res, 400, "Beberapa produk tidak terdaftar")
    
        const order_id = `MAREMO-${nanoid(5)}-${nanoid(3)}`;

        const findTransaction = await transactionModel.find({
            $or: [
                {
                    "rental_duration.start_date": {
                        $lte: new Date(checkValidation.data.rental_duration.end_date),
                    },
                    "rental_duration.end_date": {
                        $gte: new Date(checkValidation.data.rental_duration.start_date),
                    },
                }
            ],
            product_ids: { $in: checkValidation.data.product_ids}, 
            status: { $nin: ["failure", "refund"] },
            deleted_at: null,
        });

        if (findTransaction.length)
            return message(res, 400, "Sudah ada yang menyewa mobil ini")

        let item_details = findProductId.map((product) => {
            return {
                id: product._id,
                name: product.name,
                price: product.price,
                quantity: rentalDays,
                merchant_name: "MAREMO",
                category: "Mobil"
            }
        })

        const gross_amount = item_details.reduce((total, item) => total + (item.price * item.quantity), 0);

        const parameter = {
            transaction_details: {
                order_id,
                gross_amount,
            },
            customer_details: {
                first_name: findUserId.first_name,
                last_name: findUserId.last_name,
                email: findUserId.email,
                phone: findUserId.phone,
            },
            item_details
        };

        
        let snap = new midtransClient.Snap({
            isProduction: false,
            serverKey: MIDTRANS_SERVER_KEY,
            clientKey: MIDTRANS_CLIENT_KEY,
        });


        snap.createTransaction(parameter).then( async (response) => {
            const payload = {
                ...parameter.transaction_details,
                ...checkValidation.data,
                rental_days: rentalDays,
                token: response.token,
                redirect_url: response.redirect_url,
            };

            await transactionModel.create(payload);

            message(res, 201, "Berhasil dimasukkan ke dalam keranjang", response);
        }).catch((error) => {
            const { error_messages: errors} = error.ApiResponse;

            message(res, 500, "Midtrans", {
                errors,
            })
        });
    } catch (error) {
        message(res, 500, error?.message || "Server internal error")
    }
}