import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import tokenModel from "../models/tokenModel.js";
import { mailer } from "./mailer.js";

export const getUsers = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(401).json("Access denied");
    }

    const allUsers = await userModel.find();
    res.status(200).json(allUsers);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const signIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    // const existingToken = await userModel.findOne({ email });
    if (!existingUser)
      return res.status(400).json({ message: "User doesn't exist. Sign Up" });
    if (existingUser.blockedUntil > Date.now()) {
      return res.status(400).json({
        message: "Account temporarily suspended, try again later",
      });
    }
    if (!existingUser.emailVerified) {
      return res.status(400).json({
        message: "Email not verified. Verify now",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect)
      return res.status(404).json({ message: "Incorrect Password." });

    await userModel.findByIdAndUpdate(
      existingUser._id,
      {
        $set: { lastLoginAt: Date.now().toString() },
        $push: { signedin: 1 },
      },
      { new: true }
    );

    const token = jwt.sign(
      { email: existingUser.email, id: existingUser._id },
      process.env.TESTID,
      { expiresIn: "3d" }
    );

    return res.status(200).json({ user: existingUser, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const signUp = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exist. Sign in." });

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await userModel.create({
      email,
      password: hashedPassword,
    });

    return res
      .status(200)
      .json({ message: "Account created successfully", email: newUser.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendVerificationToken = async (req, res) => {
  const { email } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    if (!existingUser)
      return res
        .status(400)
        .json({ message: "No user found with the provided email address" });
    if (existingUser.emailVerified)
      return res
        .status(400)
        .json({ message: "Email is already verified. Sign in" });

    const data = await mailer(existingUser.email, "verifyEmail");

    return res.status(200).json({ message: "Code sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, token } = req.body;
  try {
    const existingToken = await tokenModel.findOne({ email });
    const existingUser = await userModel.findOne({ email });
    if (existingUser.blockedUntil > Date.now()) {
      return res.status(400).json({
        message: "Account temporarily suspended, try again later",
      });
    }

    if (!existingToken) {
      return res.status(404).json({
        message:
          "No token found for this email. Try requesting for a new token",
      });
    }

    if (existingToken.attempts >= 5) {
      await tokenModel.findOneAndDelete({ email });
      const blockedUntil = Date.now() + 3 * 60 * 60 * 1000;
      await userModel.findOneAndUpdate({ email }, { $set: { blockedUntil } });
      return res.status(400).json({
        message: "Maximum attempts exceeded. Account temporarily suspended.",
      });
    }

    if (existingToken.code !== token) {
      const updatedToken = await tokenModel.findOneAndUpdate(
        { email },
        { $set: { attempts: existingToken.attempts + 1 } },
        { new: true }
      );
      return res.status(400).json({
        message: "Incorrect token",
        attempts: updatedToken.attempts,
      });
    }

    if (existingToken.expiresAt < Date.now()) {
      await tokenModel.findOneAndDelete({ email });
      return res.status(400).json({ message: "Token has expired" });
    }

    await userModel.findOneAndUpdate(
      { email },
      { $set: { emailVerified: true } }
    );
    await tokenModel.findOneAndDelete({ email });
    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const completeSignUp = async (req, res) => {
  const {
    email,
    phoneNumber,
    firstName,
    lastName,
    dateOfBirth,
    address,
    state,
  } = req.body;
  try {
    const existingUser = await userModel.findOne({ email });
    const existingAccountNum = await userModel.findOne({
      accountNumber: phoneNumber,
    });
    if (!existingUser)
      return res.status(400).json({
        message: "User does not exist. Check provided email address again.",
      });
    if (existingAccountNum)
      return res.status(400).json({ message: "Account number already in use" });

    const updatedUser = await userModel.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          phoneNumber,
          firstName,
          lastName,
          dateOfBirth,
          address,
          state,
          accountNumber: phoneNumber,
          lastLoginAt: Date.now().toString(),
          signedIn: [1],
        },
      }
    );

    const token = jwt.sign(
      { email: updatedUser.email, id: updatedUser._id },
      process.env.TESTID,
      {
        expiresIn: "3d",
      }
    );

    return res.status(200).json({ user: updatedUser, token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const signOut = async (req, res) => {
  try {
    await userModel.findByIdAndUpdate(req.userId, {
      $set: {
        lastLogoutAt: Date.now().toString(),
      },
      $pop: {
        signedin: 1, // remove last element from array
      },
    });
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const updateAccount = async (req, res) => {
  const data = req.body;
  const id = req.params.id;
  try {
    const user = await userModel.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(401).json("Access denied");
    }

    const updatedAccount = await userModel.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );
    return res.status(200).json(updatedAccount);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const deleteAccount = async (req, res) => {
  const id = req.params.id;
  const message = "Account deleted successfully";
  try {
    const sender = await userModel.findById(req.userId);
    const user = await userModel.findById(id);
    if (id === req.userId) {
      await userModel.findByIdAndRemove(id);
      return res.status(200).json({ message });
    } else if (sender.isOwner) {
      await userModel.findByIdAndRemove(id);
      return res.status(200).json({ message });
    } else if (sender.isAdmin && !user.isOwner) {
      await userModel.findByIdAndRemove(id);
      return res.status(200).json({ message });
    } else {
      return res.status(401).json({ message: "Access denied" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found with the provided email address" });
    }

    const data = mailer(user.email, "");

    return res.status(200).json({ message: "Code sent to email successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.passwordResetCode || user.passwordResetCode.code !== code) {
      user.passwordResetCode.attempts += 1;
      await user.save();
      return res.status(401).json({ message: "Invalid code" });
    }

    if (user.passwordResetCode.expiresAt < new Date()) {
      return res.status(401).json({ message: "Code has expired" });
    }

    if (user.passwordResetCode.attempts >= 3) {
      return res.status(401).json({ message: "Maximum attempts exceeded" });
    }

    // Update the user's password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    user.passwordResetCode = undefined;
    await user.save();

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
