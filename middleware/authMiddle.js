import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";

const authMiddle = async (req, res, next) => {
  try {
    const token = req?.headers?.authorization?.split(" ")[1];
    let decodedData;
    if (token) {
      decodedData = jwt.verify(token, process.env.TESTERID);
      req.userId = decodedData?.id;
    }
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      const decoded = jwt.decode(token);
      if (decoded && decoded.id) {
        await userModel.findByIdAndUpdate(decoded.id, {
          $set: { lastLogoutAt: new Date() },
          $pop: { signedIn: 1 },
        });
      }
      return res.status(401).json({ message: "Session timed out" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Invalid token" });
    } else {
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
};

export default authMiddle;
