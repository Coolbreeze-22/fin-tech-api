import mongoose from "mongoose";

const transactionSchema = mongoose.Schema(
  {
    senderAccount: { type: String },
    senderFirstName: { type: String },
    senderLastName: { type: String },
    amount: { type: String, required: true, trim: true },
    fee: { type: String, required: true, trim: true },
    status: { type: String, trim: true },
    receiverAccount: { type: String, trim: true },
    receiverFirstName: { type: String },
    receiverLastName: { type: String },
  },
  { timestamps: true }
);

const transactionModel = mongoose.model("transactionModel", transactionSchema);

export default transactionModel;
