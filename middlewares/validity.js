// ./middlewares/validity.js
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { User } from "../models/userModel.js";

export const validation = asyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error(
      "User is not authorized or token is missing. Session Expired."
    );
  }
  // console.log("token : ",token);
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.user._id).select("-password");

    if (!req.user) {
      res.status(StatusCodes.UNAUTHORIZED);
      throw new Error("User not found (invalid token payload)");
    }

    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    res.status(StatusCodes.UNAUTHORIZED);
    if (error.name === "TokenExpiredError") {
      throw new Error("Session expired. Please log in again.");
    }
    throw new Error("User is not authorized, token is invalid.");
  }
});
