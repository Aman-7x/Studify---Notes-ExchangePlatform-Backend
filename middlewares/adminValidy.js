import asyncHandler from "express-async-handler";
import { StatusCodes } from 'http-status-codes';

export const adminValidation = asyncHandler(async (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(StatusCodes.FORBIDDEN);
        throw new Error("Access Forbidden: Only administrators can perform this action.");
    }
    next(); 
});