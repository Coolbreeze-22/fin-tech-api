import nodemailer from "nodemailer";
import tokenModel from "../models/tokenModel.js";
import { TOKEN_DURATION } from "./constants.js";

export const mailer = async (email, label) => {
  let codeGenerated = false;
  try {
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
    const expiresAt = Date.now() + TOKEN_DURATION;

    const token = new tokenModel({
      email,
      code,
      expiresAt,
      attempts: 0,
    });
    await token.save();

    codeGenerated = true;

    const textLabel =
      label === "verifyEmail" ? "email verification" : "password reset";

    const subjectLabel =
      label === "verifyEmail"
        ? "Email Verification Code"
        : "Password Reset Code";

    const mailOptions = {
      from: process.env.FROM,
      to: email,
      subject: subjectLabel,
      text: `Dear User, Your ${textLabel} code is: ${code}. Enter this code to complete your ${textLabel}. If you didn't request this, you can safely ignore it.`,
      html: `<p style="color: #333;">Dear <b>User</b>,</p>
  <p>Your ${textLabel} code is: <b style="color: #000;">${code}</b></p>
  <p style="font-size: 14px; color: #666;">
    Enter this code to complete your ${textLabel}. If you didn't request this, you can safely ignore it.</p>`,
    };

    const data = await transporter.sendMail(mailOptions);
    return data;
  } catch (error) {
    if (codeGenerated) {
      await tokenModel.deleteOne({ email });
    }
    throw error;
  }
};
