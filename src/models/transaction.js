import { Schema, model } from "mongoose";

const transactionSchema = new Schema(
    {
        order_id: {
            type: String,
            required: true,
        },
        gross_amount: {
            type: Number,
            required: true,
        },
        rental_duration: {
            type: Object,
            start_date: {
                type: Date,
                required: true,
            },
            end_date: {
                type: Date,
                required: true,
            },
        },
        transaction_id: {
            type: String,
            default: null,
        },
        token: {
            type: String,
            required: true,
        },
        redirect_url: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            default: "pending",
        },
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "Users",
            required: true,
        },
        product_ids: [
            {
                type: Schema.Types.ObjectId,
                ref: "Products",
                required: true,
            }
        ],
        rental_days: {
            type: Number,
            required: true,
        },
        note_refund: {
            type: String,
            default: null,
        },
        refund_date: {
            type: Date,
            default: null,
        },
        deleted_at: {
            type: Date,
            default: null,
        },
    },  
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at",
        }
    }
);

const transactionModel = model("Transactions", transactionSchema)

export default transactionModel;