import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";

export const getTransactions = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    if (user.isAdmin) {
      const transactions = await transactionModel.find();
      res.status(200).json(transactions);
    } else {
      res.status(401).json("Access denied");
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const getUserTransactions = async (req, res) => {
  try {
    if (req.userId) {
      const transactions = await transactionModel.find({
        $or: [
          { senderAccount: user.accountNumber },
          { receiverAccount: user.accountNumber },
        ],
      });
      res.status(200).json(transactions);
    } else {
      res.status(403).json("Authentication required");
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createTransaction = async (req, res) => {
  const transaction = req.body;
  try {
    if (req.userId) {
      const newTransaction = await new transactionModel(transaction).save();
      res.status(200).json(newTransaction);
    } else {
      res.status(403).json("Authentication required");
    }
  } catch (error) {
    res.status(404).json({ message: error });
  }
};

export const updateTransaction = async (req, res) => {
  const transaction = req.body;
  try {
    const user = await userModel.findById(req.userId);
    if (user.isAdmin) {
      const updatedPost = await transactionModel.findByIdAndUpdate(
        transaction._id,
        { $set: transaction },
        { new: true }
      );
      res.status(200).json(updatedPost);
    } else {
      res.status(401).json("Access denied");
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  const id = req.params.id;
  try {
    const user = await userModel.findById(req.userId);
    if (user.isAdmin) {
      await transactionModel.findByIdAndRemove(id);
      res.status(200).json("Deleted Successfully");
    } else {
      res.status(401).json("Access denied");
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};
