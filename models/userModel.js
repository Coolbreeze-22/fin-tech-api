import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    accountNumber: { type: String, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    phoneNumber: { type: String, trim: true },
    balance: { type: Number, default: 0, trim: true },
    dateOfBirth: { type: String, trim: true },
    photo: { type: String },
    country: { type: String, trim: true },
    state: { type: String, trim: true },
    city: { type: String, trim: true },
    address: { type: String, trim: true },
    isAdmin: { type: Boolean, default: false },
    isOwner: { type: Boolean, default: false },
    signedIn: {
      type: [],
      default: [],
    },
    lastLoginAt: { type: String, trim: true },
    lastLogoutAt: { type: String, trim: true },
    password: { type: String, required: true },
    status: { type: String, trim: true },
    blockedUntil: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const userModel = mongoose.model("userModel", userSchema);

export default userModel;
