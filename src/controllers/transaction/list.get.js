import transactionModel from "../../models/transaction.js";
import message from "../../utils/message.js";
import validation from "../../utils/validation.js";
import { z } from "zod";

const schemaValidation = z
  .object({
    start_date: z.string().optional(),
    end_date: z.string().optional(),
  })
  .refine((data) => {
    if (!data.start_date || !data.end_date) return true;

    return new Date(data.start_date) <= new Date(data.end_date)
  },
  {
    message: "start_date tidak boleh lebih besar dari pada end_date",
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
    const { start_date, end_date, status, q = "" } = req.query;


    const checkValidation = validation(schemaValidation, req.query);

    if (!checkValidation.success)
      return message(res, 422, "Validasi error", {
        errors: checkValidation.errors,
      });

    const page = req.query.page ? Number(req.query.page) : 1;
    const per_page = req.query.per_page ? Number(req.query.per_page) : 10;
    const skip = (page - 1) * per_page;
      
    const matchQuery = {
        deleted_at: null,
    }

    if (q) {
        matchQuery.$or = [
            {
                order_id: {
                    $regex: q,
                    $options: "i",
                }
            },
            {
                transaction_id: {
                    $regex: q,
                    $options: "i",
                }
            }
        ];
    }

    if (status) {
        matchQuery.status = status;
    }

    if (start_date && end_date) {
        matchQuery.$and = [
            {
                "rental_duration.start_date": {
                    $lte: new Date(end_date)
                }
            },
            {
                "rental_duration.end_date": {
                    $gte: new Date(start_date)
                }
            }
        ]
    }

    const filters = [
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "user_id",
          as: "user_detail",
        },
      },
      {
        $unwind: {
            path: "$user_detail",
            preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "products",
          foreignField: "_id",
          localField: "product_ids",
          as: "product_detail",
        },
      },
      {
        $project: {
          "user_detail.password": 0,
        },
      },
      {
        $sort: {
            _id: -1
        }
      },
      {
        $skip: skip
      },
      {
        $limit: per_page
      }
    ];

    const data = await transactionModel.aggregate(filters)

    const countDocuments = await transactionModel.aggregate([
      {
        $match: matchQuery,
      },
      {
        $count: "total",
      },
    ]);

    const total = countDocuments.length ? countDocuments[0].total: 0;

    const pagination = {
      page,
      per_page,
      total,
      total_pages: Math.ceil(total / per_page)
    };

    message(res, 200, "Daftar transaksi", data, pagination);
  } catch (error) {
    console.error("TRANSACTION LIST ERROR:", error);

    return message(res, 500, error?.message || "Server Internal Error");
  }
}
