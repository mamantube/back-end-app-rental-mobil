import transactionModel from "../../models/transaction.js";
import message from "../../utils/message.js";
import validation from "../../utils/validation.js";
import { z } from "zod";

const schemaValidation = z
  .object({
    start_date: z.coerce.date(),
    end_date: z.coerce.date(),
  })
  .refine((data) => {
    return !data.end_date || data.start_date <= data.end_date;
  }, "start_date tidak boleh lebih besar dari pada end_date");

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
    const { start_date, end_date, status, q } = req.query;

    const checkValidation = validation(schemaValidation, req.query);

    if (!checkValidation.success)
      return message(res, 422, "Validasi error", {
        errors: checkValidation.errors,
      });

    const q = req.query.q || "";
    const page = req.query.page ? Number(req.query.page) : 1;
    const per_page = req.query.per_page ? Number(req.query.per_page) : 10;
    const skip = page > 1 ? (page - 1) * per_page : 0;

    const macthQuery = {
      $and: [
        {
          $or: [
            {
              order_id: {
                $regex: q,
                $options: "i",
              },
            },
            {
              transaction_id: {
                $regex: q,
                $options: "i",
              },
            },
          ],
        },

        {
          "rental_duration.start_date": {
            $lte: new Date(end_date),
          },
          "rental_duration.end_date": {
            $gte: new Date(start_date),
          },
        },
      ],

      deleted_at: null,
    };

    if (status) {
      macthQuery.status = status;
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
        $unwind: "$user_detail",
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
        $facet: {
          success: [
            {
              $match: {
                status: "success",
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
          ],

          pending: [
            {
              $match: {
                status: "pending",
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
          ],

          expire: [
            {
              $match: {
                status: "expire",
              },
            },
            {
              $sort: {
                _id: -1,
              },
            },
          ],
        },
      },
    ];
    // const filters = [
    //     {
    //         $match: {
    //             $and: [
    //                 {
    //                     $or: [
    //                         { order_id: { $regex: q, $options: "i"} },
    //                         { transaction_id: { $regex: q, $options: "i"} },
    //                         // { "product_detail.name": { $regex: q, $options: "i"} },
    //                     ],
    //                 },
    //                 {
    //                     $or: [
    //                         {
    //                             "rental_duration.start_date": { $lte: new Date(end_date) },
    //                             "rental_duration.end_date": { $gte: new Date(start_date) },
    //                         }
    //                     ],
    //                 },
    //             ],
    //             deleted_at: null,
    //         },
    //     },
    //     {
    //         $lookup: {
    //             from: "users",
    //             foreignField: "_id",
    //             localField: "user_id",
    //             as: "user_detail"
    //         },
    //     },
    //     {
    //         $unwind: "$user_detail",
    //     },
    //     {
    //         $lookup: {
    //             from: "products",
    //             foreignField: "_id",
    //             localField: "product_ids",
    //             as: "product_detail"
    //         }
    //     },
    //     {
    //         $project: {
    //             "user_detail.password": 0,
    //         }
    //     },

    // ];

    const data = await transactionModel
      .aggregate(filters)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(per_page);

    const countDocuments = await transactionModel.aggregate([
      {
        $match: macthQuery,
      },
      {
        $count: "total",
      },
    ]);

    // const countDocuments = await transactionModel.aggregate(filters).count("total");

    const pagination = {
      page,
      per_page,
      total: countDocuments.length ? countDocuments[0].total : 0,
    };

    // const pagination = {
    //     page,
    //     per_page,
    //     total: countDocuments.length ? countDocuments[0].total : 0,
    // };

    message(res, 200, "Daftar transaksi", data, pagination);
  } catch (error) {
    message(res, 500, error?.message || "Server internal error");
  }
}
