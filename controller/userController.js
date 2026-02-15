import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import tokenModel from "../models/tokenModel.js";
import { mailer } from "../services/mailer.js";
import { getUserDeviceInfo } from "../services/userAgent.js";
import {
  handleUserUnblock,
  generateUniqueAccountNumber,
  isUserMissingOrBlockedOrUnverified,
  isUserMissingOrBlockedOrVerified,
} from "./utils.js";

export const getUsers = async (req, res) => {
  try {
    const user = await userModel.findById(req.userId);
    if (!user.isAdmin) {
      return res.status(401).json("Access denied");
    }

    const allUsers = await userModel.find();
    res.status(200).json(allUsers);
  } catch (error) {
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
  }
};

export const signIn = async (req, res) => {
  const { email, password } = req.body;
  try {
    let existingUser;
    existingUser = await userModel.findOne({ email });
    if (isUserMissingOrBlockedOrUnverified(existingUser, res)) return;
    existingUser = await handleUserUnblock(existingUser);

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordCorrect)
      return res.status(401).json({ message: "Incorrect Password." });

    const deviceInfo = getUserDeviceInfo(req);
    console.log("deviceInfo: ", deviceInfo);

    const newUser = await userModel.findByIdAndUpdate(
      existingUser._id,
      {
        $set: { lastLoginAt: new Date().toISOString() },
        $push: { signedIn: deviceInfo },
      },
      { new: true }
    );

    const token = jwt.sign(
      { email: newUser.email, id: newUser._id },
      process.env.TESTID,
      { expiresIn: "3d" }
    );

    return res
      .status(200)
      .json({ user: newUser, token, toBeRemoved: deviceInfo });
  } catch (error) {
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
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
      status: "pending",
    });

    return res
      .status(200)
      .json({ message: "Account created successfully", email: newUser.email });
  } catch (error) {
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
  }
};

export const sendVerificationToken = async (req, res) => {
  const { email } = req.body;
  try {
    let existingUser;
    existingUser = await userModel.findOne({ email });

    if (isUserMissingOrBlockedOrVerified(existingUser, res)) return;
    existingUser = await handleUserUnblock(existingUser);
    const result = await mailer(existingUser.email, "verifyEmail");

    if (typeof result === "string") {
      return res.status(400).json({ message: result });
    }

    return res.status(200).json({
      message: "Verification code sent successfully",
      email: existingUser.email,
      accepted: result.accepted,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyEmail = async (req, res) => {
  const { email, token } = req.body;
  try {
    let existingUser;
    existingUser = await userModel.findOne({ email });
    const existingToken = await tokenModel.findOne({ email });

    if (isUserMissingOrBlockedOrVerified(existingUser, res)) return;
    existingUser = await handleUserUnblock(existingUser);

    if (!existingToken) {
      return res.status(404).json({
        message: "Token not found. Try requesting for a new token.",
      });
    }

    if (existingToken.code !== token) {
      if (existingToken.attempts + 1 >= 5) {
        await tokenModel.findOneAndDelete({ email });

        const blockedUntil = Date.now() + 3 * 60 * 60 * 1000;
        const status = "blocked";
        await userModel.findOneAndUpdate(
          { email },
          { $set: { blockedUntil, status } }
        );

        return res.status(400).json({
          message: "Maximum attempts exceeded. Account temporarily suspended.",
        });
      }

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
      return res.status(400).json({
        message: "Expired token. Try requesting for a new token.",
      });
    }

    await tokenModel.findOneAndDelete({ email });
    await userModel.findOneAndUpdate(
      { email },
      { $set: { emailVerified: true, status: "active" } }
    );

    return res.status(200).json({
      message: "Email verified successfully",
      email: existingUser.email,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
  }
};

export const completeSignUp = async (req, res) => {
  const {
    email,
    phoneNumber,
    firstName,
    lastName,
    dateOfBirth,
    country,
    state,
    city,
    address,
  } = req.body;

  try {
    let existingUser;
    existingUser = await userModel.findOne({ email });

    if (isUserMissingOrBlockedOrUnverified(existingUser, res)) return;
    existingUser = await handleUserUnblock(existingUser);
    const deviceInfo = getUserDeviceInfo(req);
    const accountNumber = await generateUniqueAccountNumber();

    const updatedUser = await userModel.findOneAndUpdate(
      { email },
      {
        $set: {
          phoneNumber,
          firstName,
          lastName,
          dateOfBirth,
          country,
          state,
          city,
          address,
          accountNumber,
          lastLoginAt: new Date().toISOString(),
        },
        $push: { signedIn: deviceInfo },
      },
      { new: true }
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
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
  }
};

export const signOut = async (req, res) => {
  try {
    const { userId } = req;
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const deviceInfo = getUserDeviceInfo(req);

    const updatedSessions = user.signedIn.filter(
      (session) =>
        session.ip !== deviceInfo.ip || session.device !== deviceInfo.device
    );

    if (user.signedIn.length === updatedSessions.length) {
      return res.status(400).json({ message: "No matching sessions found" });
    }

    await userModel.findByIdAndUpdate(
      userId,
      {
        signedIn: updatedSessions,
        lastLogoutAt: new Date().toISOString(),
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Signed out successfully",
      sessionsClosed: user.signedIn.length - updatedSessions.length,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
    // return res.status(500).json({ message: "Internal server error" });
  }
};

// continue from here
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await userModel.findOne({ email });
    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found" });
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

