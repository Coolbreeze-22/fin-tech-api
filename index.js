import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import transactionRouter from "./routes/transaction.js";
import userRouter from "./routes/users.js";
import { startScheduler } from "./services/scheduler.js";
import "./config.js";

const app = express();

app.use(bodyParser.json({ limit: "1mb" }));
app.use(bodyParser.urlencoded({ limit: "1mb", extended: true }));
app.use(cors());

app.use("/transaction", transactionRouter);
app.use("/user", userRouter);

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
  .then(async () => {
    // await startScheduler();
    // console.log("✅ Scheduler started");

    app.listen(PORT, () => console.log(`Server running on port: ${PORT}`));
  })
  .catch((error) => console.log(`mongoose connect error: ${error.message}`));
