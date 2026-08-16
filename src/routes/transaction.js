import express from "express";
import Checkout from "../controllers/transaction/checkout.post.js";
import { authentication, customer, admin} from "../middleware/auth.js"
import List from "../controllers/transaction/list.get.js";
import Detail from "../controllers/transaction/detail.get.js";
import CheckStatus from "../controllers/transaction/checkstatus.post.js";
import Refund from "../controllers/transaction/refund.put.js";
import Reschedule from "../controllers/transaction/reschedule.put.js";
import Erase from "../controllers/transaction/erase.delete.js";
import detailTransaction from "../controllers/transaction/detail.get.js"
import notificationPost from "../controllers/transaction/notification.post.js";

const transactionRoute = express.Router();

transactionRoute.post("/transaction/checkout", authentication, customer, Checkout)
transactionRoute.get("/transaction", authentication, List);
transactionRoute.get("/transaction/:_id", authentication, detailTransaction);
transactionRoute.post("/transaction/check-status/:order_id", authentication, CheckStatus);
transactionRoute.put("/transaction/refund/:_id", authentication, admin, Refund);
transactionRoute.put("/transaction/:_id", authentication, customer, Reschedule);
transactionRoute.delete("/transaction/erase/:token", authentication, customer, Erase)
transactionRoute.post("/transaction/notification", notificationPost);

export default transactionRoute;