import transactionModel from "../../models/transaction.js";
import message from "../../utils/message.js";
import {
  MIDTRANS_CLIENT_KEY,
  MIDTRANS_SERVER_KEY,
} from "../../utils/unpublished.js";
import midtransClient from "midtrans-client";
import crypto from "crypto";

export default async function (req, res) {
  try {
    const notification = req.body;

    console.log("=== MIDTRANS NOTIFICATION ===");
    console.log(notification);

    const {
      order_id,
      transaction_status,
      payment_type,
      transaction_id,
      gross_amount,
      status_code,
      signature_key,
      va_numbers,
    } = notification;

    if (!order_id) {
      console.error("Order ID tidak ditemukan");
      return message(res, 200, "Order ID tidak ditemukan");
    }

    const signature = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
      .digest("hex");

    if (signature !== signature_key) {
      console.error("Signature midtrans tidak valid");

      return message(res, 403, "Invalid signature");
    }

    const core = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: MIDTRANS_SERVER_KEY,
      clientKey: MIDTRANS_CLIENT_KEY,
    });

    const transactionStatus = await core.transaction.status(order_id);

    console.log("== TRANSACTION STATUS ==");
    console.log(transactionStatus);

    const paymentType = transactionStatus.payment_type || payment_type || null;

    const updateData = {
      status: transactionStatus.transaction_status || transaction_status,
      transaction_id:
        transactionStatus.transaction_id || transaction_id || null,
      payment_type: paymentType,
    };

    if (
      paymentType === "bank_transfer" &&
      va_numbers &&
      va_numbers.length > 0
    ) {
      const va = transactionStatus.va_numbers[0];

      console.log("== VA DATA ==");
      console.log(va);

      updateData.payment_detail = {
        bank: va.bank,
        va_number: va.va_number,
      };
    } else if (paymentType === "qris") {
      console.log("========== QRIS DEBUG ==========");
      console.log("payment_type:", transactionStatus.payment_type);
      console.log("qr_string:", transactionStatus.qr_string);
      console.log("actions:", transactionStatus.actions);
      console.log("================================");
      
      const qrAction = transactionStatus.actions?.find(
        (action) =>
          action.name === "generate-qr-code-v2" ||
          action.name === "generate-qr-code",
      );

      updateData.payment_detail = {
        qr_url: qrAction?.qr_url || null,
        qr_string: transactionStatus.qr_string || null,
      };

      console.log("== QR PAYMENT DETAIL ==");
      console.log(updateData.payment_detail);
    } else {
      updateData.payment_detail = {
        transaction_id:
          transactionStatus.transaction_id || transaction_id || null,
      };
    }

    console.log("== UPDATE DATA ==");
    console.log(updateData);

    const transaction = await transactionModel.findOneAndUpdate(
      {
        order_id: order_id,
      },
      updateData,
      {
        new: true,
      },
    );

    if (!transaction) {
      console.warn(`Transaksi ${order_id} tidak ditemukan di database`);

      return message(
        res,
        200,
        "Notifikasi diterima, transaksi tidak ditemukan",
      );
    }

    console.log("== TRANSACTION UDPATE ==");
    console.log(transaction);

    return message(res, 200, "Notifikasi berhasil diproses", transaction);
  } catch (error) {
    console.error("MIDTRANS NOTIFICATION ERROR", error);

    return message(res, 500, error?.message || "Server internal error");
  }
}
