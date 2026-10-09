import express from "express";
import { validation } from "../middlewares/validity.js";
import {
  submitFeedback,
  getAllFeedbacks,
  getFeedbackById,
  updateFeedbackStatus,
  deleteFeedback,
} from "../controllers/feedbackController.js";
import { adminValidation } from "../middlewares/adminValidy.js";

const router = express.Router();

router.post("/", validation, submitFeedback);

router.get("/", getAllFeedbacks);

// --- ADMIN-PROTECTED ROUTES FOR FEEDBACK MANAGEMENT ---
router.get("/:id", validation, adminValidation, getFeedbackById); // Get specific feedback details
router.put("/:id/status", validation, adminValidation, updateFeedbackStatus); // Update feedback status
router.delete("/:id", validation, adminValidation, deleteFeedback); // Delete feedback

export default router;
