import express from "express";
import multer from "multer";

import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  uploadProfilePic,
  deleteMyAccount,
  getAllUsers,
  getUserById,
  updateUserRole,
  deleteUser,
  verifyMe,
} from "../controllers/userController.js";
import { validation } from "../middlewares/validity.js";
import { adminValidation } from "../middlewares/adminValidy.js";

const router = express.Router();
const upload = multer({ dest: "public/uploads/profile-pics" });

router.post("/signup", registerUser);
router.post("/signin", loginUser);
router.post("/logout", logoutUser);
router.get("/verify", validation, verifyMe);
// Protected routes
router.get("/profile", validation, getUserProfile);
router.put("/profile", validation, updateUserProfile);
router.put("/profile/password", validation, changePassword);
router.delete("/profile", validation, deleteMyAccount);

router.post(
  "/profile/upload-pic",
  validation,
  upload.single("fileUrl"),
  uploadProfilePic
);

// --- ADMIN-PROTECTED ROUTES FOR USER MANAGEMENT ---
router.get("/", validation, adminValidation, getAllUsers);  
router.get("/:id", validation, adminValidation, getUserById); 
router.put("/:id/role", validation, adminValidation, updateUserRole); 
router.delete("/:id", validation, adminValidation, deleteUser); 
export default router;
