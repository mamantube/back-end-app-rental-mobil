import transactionModel from "../../models/transaction.js";
import message from "../../utils/message.js";
import { MIDTRANS_CLIENT_KEY, MIDTRANS_SERVER_KEY } from "../../utils/unpublished.js";
import midtransClient from "midtrans-client";

export default async function ( req, res) {
    try {
        const notification = req.body;

        console.log("=== MIDTRANS NOTIFICATION ===")
        console.log(notification);

        const { order_id, transaction_status, fraud_status, payment_type } = notification;

        if (!order_id) {
            return message(res, 400, "Order ID tidak ditemukan");
        };

        const core = new midtransClient.CoreApi({
            isProduction: false,
            serverKey: MIDTRANS_SERVER_KEY,
            clientKey: MIDTRANS_CLIENT_KEY,
        });

        const transactionStatus = await core.transaction.status(order_id);

        console.log("=== TRANSACTION STATUS ===");
        console.log(transactionStatus);

        const updateData = {
            status: transactionStatus.transaction_status,
            transaction_id: transactionStatus.transaction_id || null,
            payment_type: transactionStatus.payment_type || payment_type || null,
        };

        if (transactionStatus.payment_type === "bank_transfer" && transactionStatus.va_numbers?.length) {
            const va = transactionStatus.va_numbers[0];

            updateData.payment_detail = {
                bank: va.bank,
                va_number: va.va_number
            }
        } else if (transactionStatus.payment_type === "qris") {
            updateData.payment_detail = {
                qr_string: transactionStatus.qr_string || null
            }
        } else {
            updateData.payment_detail = {
                transaction_id: transaction_status.transaction_id || null
            }
        }

        const transaction = await transactionModel.findOneAndUpdate(
            {
                order_id,
            },
            updateData,
            {
                new: true
            },

        );

        if (!transaction) {
            return message (res, 404, "Data transaksi tidak ditemukan")
        }

        return message(res, 200, "Data Transaksi berhasil diperbaharui", transaction)
    } catch (error) {
        console.error("MIDTRANS NOTIFICATION ERROR", error);

        return message(res, 500, error?.message || "Server internal error")
    }
}