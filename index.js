import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import transactionRouter from "./routes/transaction.js";
import userRouter from "./routes/users.js";

const app = express();
dotenv.config();

app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));
app.use(cors());
app.use("/transaction", transactionRouter);
app.use("/user", userRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.type === "entity.too.large") {
    res.status(413).send("Payload Too Large. Limit is 1MB.");
  } else {
    next(err);
  }
});

const PORT = process.env.PORT;

mongoose
  .connect(process.env.CONNECTION_URL)
  .then(() =>
    app.listen(PORT, () => console.log(`Server running on port: ${PORT}`))
  )
  .catch((error) => console.log(error.message));
