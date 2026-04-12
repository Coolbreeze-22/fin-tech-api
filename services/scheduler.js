import Agenda from "agenda";
import userModel from "../models/userModel.js";
import tokenModel from "../models/tokenModel.js";
import "../config.js";
import {
  SESSION_DURATION,
  TOKEN_DURATION,
  SESSION_TIME,
  TOKEN_TIME,
} from "./constants.js";

export const cleanExpiredSessions = async () => {
  try {
    const cutoff = new Date(Date.now() - SESSION_DURATION);

    const result = await userModel.updateMany(
      { "signedIn.signedInAt": { $lt: cutoff } },
      { $pull: { signedIn: { signedInAt: { $lt: cutoff } } } }
    );

    console.log(
      `[✅ cleanExpiredSessions] Modified ${result.modifiedCount} user(s)`
    );
  } catch (error) {}
};

export const cleanExpiredTokens = async () => {
  try {
    const cutoff = new Date(Date.now() - TOKEN_DURATION);

    const result = await tokenModel.deleteMany({
      expiresAt: { $lt: cutoff },
    });

    console.log(
      `[✅ cleanExpiredTokens] Deleted ${result.deletedCount} expired token(s)`
    );
  } catch (error) {}
};

const agenda = new Agenda({
  db: {
    address: process.env.CONNECTION_URL_WITHOUT_SRV,
    collection: "fintechAgendaJobs",
    options: { useUnifiedTopology: true },
  },
  defaultLockLifetime: 30_000,
  retryDelay: 10_000,
  maxRetries: 3,
});

agenda.define("clean-sessions", cleanExpiredSessions);
agenda.define("clean-tokens", cleanExpiredTokens);

export const startScheduler = async () => {
  agenda.on("error", (error) => console.error("❌ Agenda error:", error));
  await agenda.start();
  agenda.every(SESSION_TIME, "clean-sessions");
  agenda.every(TOKEN_TIME, "clean-tokens");
};
