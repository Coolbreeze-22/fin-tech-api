import express from "express";
import {
  getTransactions,
  getUserTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "../controller/transactionController.js";
import authMiddle from "../middleware/authMiddle.js";

const transactionRouter = express.Router();

transactionRouter.get("/", authMiddle, getTransactions);
transactionRouter.get("/user", authMiddle, getUserTransactions);
transactionRouter.post("/create", authMiddle, createTransaction);
transactionRouter.patch("/update", authMiddle, updateTransaction);
transactionRouter.delete("/delete/:id", authMiddle, deleteTransaction);

export default transactionRouter;
