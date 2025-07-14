import mongoose from "mongoose";

const tokenSchema = mongoose.Schema({
  email: { type: String },
  code: { type: String },
  expiresAt: { type: Number, default: 0 },
  attempts: { type: Number, default: 0 },
});

const tokenModel = mongoose.model("tokenModel", tokenSchema);

export default tokenModel;
