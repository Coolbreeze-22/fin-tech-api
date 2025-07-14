import nodemailer from "nodemailer";
import tokenModel from "../models/tokenModel.js";

export const mailer = async (email, label) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL,
      pass: process.env.APP_PASSWORD,
    },
    tls: {
    rejectUnauthorized: false, // ⚠️ Not recommended for production
  },
  });

  const existingToken = await tokenModel.findOne({ email });
  if (existingToken) {
    if (existingToken.expiresAt > Date.now()) {
      return "Token already exist for this account. Enter token or try again later.";
    } else {
      await tokenModel.deleteOne({ email });
    }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;

  const token = new tokenModel({
    email,
    code,
    expiresAt,
    attempts: 0,
  });
  await token.save();

  let mailOptions;
  if (label === "verifyEmail") {
    mailOptions = {
      from: process.env.FROM,
      to: email,
      subject: "Email Verification Code",
      text: `Your verification code is: ${code}`,
      html: `<p>Your verification code is: <b>${code}</b></p>`,
    };
  } else {
    mailOptions = {
      from: process.env.FROM,
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${code}`,
      html: `<p>Your password reset code is: <b>${code}</b></p>`,
    };
  }

  const data = await transporter.sendMail(mailOptions);
  return data;
};
