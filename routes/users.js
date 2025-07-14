import express from "express";
import {
  signUp,
  sendVerificationToken,
  verifyEmail,
  completeSignUp,
  signIn,
  signOut,
  forgotPassword,
  resetPassword,
  getUsers,
  updateAccount,
  deleteAccount,
} from "../controller/userController.js";
import authMiddle from "../middleware/authMiddle.js";

const userRouter = express.Router();

userRouter.get("/", authMiddle, getUsers);
userRouter.post("/signup", signUp);
userRouter.post("/send-verification-token", sendVerificationToken);
userRouter.patch("/verify-email", verifyEmail);
userRouter.patch("/complete-signup", completeSignUp);
userRouter.patch("/signin", signIn);
userRouter.patch("/signOut", authMiddle, signOut);
userRouter.patch("/forgot-password", forgotPassword);
userRouter.patch("/reset-password", resetPassword);
userRouter.patch("/update-account/:id", authMiddle, updateAccount);
userRouter.delete("/delete-account/:id", authMiddle, deleteAccount);

export default userRouter;
