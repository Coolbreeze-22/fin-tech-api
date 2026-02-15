import { UAParser } from "ua-parser-js";

export const getUserDeviceInfo = (req) => {
  const parser = new UAParser();
  const userAgent = req.headers["user-agent"] || "";
  console.log("userAgent: ", userAgent);
  parser.setUA(userAgent);
  const ua = parser.getResult();

  const platform = `${ua.browser.name || "Unknown"} on ${
    ua.os.name || "Unknown OS"
  }`;
  const device = ua.device.type || "desktop";
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "Unknown IP";
  const signedInAt = new Date().toISOString();

  return {
    device,
    platform,
    ip,
    signedInAt,
  };
};
