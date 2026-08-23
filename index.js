import express from "express";
import cors from "cors";
import { PORT } from "./src/utils/unpublished.js";
import "./src/config/connection.js";
import seedDB from "./src/utils/seed_db.js";
import userRoute from "./src/routes/user.js";
import "./src/config/cloudinary.js"
import productRoute from "./src/routes/product.js";
import transactionRoute from "./src/routes/transaction.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({extended: true}))
await seedDB();

app.use("/api/v1", [userRoute, productRoute, transactionRoute]);
app.all("*", (req, res) => {
    res.status(404).send({ code: 404, message: "Not found"})
});

app.listen(PORT, () => console.log(`service running on http://localhost:${PORT}`));