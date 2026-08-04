import validation from "../../utils/validation.js";
import { z } from "zod";
import userModel from "../../models/users.js";
import message from "../../utils/message.js";
import bcrypt from "bcrypt";
import Jwt from "jsonwebtoken";
import { SECRET_KEY } from "../../utils/unpublished.js";

const schemaValidation = z.object({
  email: z.string().email("Email tidak valid"),
  password: z
    .string()
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/,
      "Password yang anda masukkan salah"
    ), //Minimum six characters, at least one uppercase letter, one lowercase letter and one number
});

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

    const findUserByEmail = await userModel.aggregate([
      {
        $match: {
          email: checkValidation.data.email,
          deleted_at: null,
        },
      },
      {
        $lookup: {
          from: "roles",
          foreignField: "_id",
          localField: "role_id",
          as: "role_detail",
        },
      },
      {
        $unwind: "$role_detail",
      },
    ]);

    if (!findUserByEmail.length)
      return message(res, 400, "Email yang anda masukkan belum terdaftar");

    const detailUser = findUserByEmail[0];

    const isPassword = bcrypt.compareSync(
      checkValidation.data.password,
      findUserByEmail[0].password
    );

    if (!isPassword)
      return message(res, 400, "Password yang anda masukkan salah");

    const role_user = detailUser.role_detail.name;
    const user_id = detailUser._id;
    const first_name = detailUser.first_name;

    const token = Jwt.sign(
      { user_id: detailUser._id, role_name: detailUser.role_detail.name },
      SECRET_KEY,
      { expiresIn: "1h" }
    );

    message(res, 200, "Login berhasil", {first_name, role_user, user_id, token, type: "Bearer" },);
  } catch (error) {
    message(res, 500, error?.message || "Server internal error");
  }
}
