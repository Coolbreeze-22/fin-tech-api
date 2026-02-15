import userModel from "../models/userModel.js";

export const handleUserUnblock = async (user) => {
  if (user.blockedUntil && user.blockedUntil < Date.now()) {
    const blockedUntil = 0;
    const status = user.emailVerified ? "active" : "pending";
    const updatedUser = await userModel.findByIdAndUpdate(
      user._id,
      { $set: { blockedUntil, status } },
      { new: true }
    );
    return updatedUser;
  }

  return user;
};

export const generateUniqueAccountNumber = async () => {
  const accountNumber = Math.floor(1e9 + Math.random() * 1e9).toString();
  const existingAccount = await userModel.findOne({ accountNumber });
  if (existingAccount) {
    return await generateUniqueAccountNumber();
  }
  return accountNumber;
};

export const isUserMissingOrBlockedOrUnverified = (user, res) => {
  if (!user) {
    res.status(400).json({ message: "User not found. Sign Up" });
    return true;
  }

  if (user.blockedUntil && user.blockedUntil > Date.now()) {
    res.status(400).json({
      message: "Account temporarily suspended, try again later",
    });
    return true;
  }

  if (!user.emailVerified) {
    res.status(400).json({
      message: "Email not verified",
    });
    return true;
  }

  return false;
};

export const isUserMissingOrBlockedOrVerified = (user, res) => {
  if (!user) {
    res.status(400).json({ message: "User not found. Sign Up" });
    return true;
  }

  if (user.blockedUntil && user.blockedUntil > Date.now()) {
    res.status(400).json({
      message: "Account temporarily suspended, try again later",
    });
    return true;
  }

  if (user.emailVerified) {
    res.status(400).json({ message: "Email is already verified. Sign in" });
    return true;
  }

  return false;
};
