// ./controllers/feedbackController.js
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Feedback } from "../models/feedbackModel.js"; // Import the new Feedback model
import { User } from "../models/userModel.js"; // Import User model (for population)

// @desc    Submit new feedback
// @route   POST /api/v1/feedback
// @access  Private
export const submitFeedback = asyncHandler(async (req, res) => {
  const { subject, message, category } = req.body;

  if (!subject || !message) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Subject and message are required for feedback.");
  }

  if (
    category &&
    !["Bug Report", "Feature Request", "General Feedback", "Other"].includes(
      category
    )
  ) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid feedback category provided.");
  }

  const feedback = await Feedback.create({
    subject,
    message,
    category: category || "General Feedback",
    submittedBy: req.user._id,
  });

  res.status(StatusCodes.CREATED).json({
    message: "Thank you for your feedback! We appreciate it.",
    feedbackId: feedback._id,
  });
});

// @desc    Get all feedback entries
// @route   GET /api/v1/feedback
// @access  Public (or Private Admin only, depending on use case)

export const getAllFeedbacks = asyncHandler(async (req, res) => {
  const feedbacks = await Feedback.find({})
    .populate("submittedBy", "firstName lastName profilePic") // Show who submitted it
    .sort({ createdAt: -1 }); // Newest first

  res.status(StatusCodes.OK).json(feedbacks);
});

// --- ADMIN-ONLY FUNCTIONS ---

// @desc    Get a single feedback entry by ID
// @route   GET /api/v1/feedback/:id
// @access  Private (Admin only)
export const getFeedbackById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid Feedback ID format.");
  }

  const feedback = await Feedback.findById(req.params.id).populate(
    "submittedBy",
    "firstName lastName email"
  );
  if (!feedback) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Feedback entry not found.");
  }

  res.status(StatusCodes.OK).json(feedback);
});

// @desc    Update feedback status
// @route   PUT /api/v1/feedback/:id/status
// @access  Private (Admin only)
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid Feedback ID format.");
  }

  if (!status || !["Pending", "Reviewed", "Resolved"].includes(status)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(
      "Valid 'status' (Pending, Reviewed, or Resolved) is required."
    );
  }

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Feedback entry not found.");
  }

  feedback.status = status;
  const updatedFeedback = await feedback.save();

  res.status(StatusCodes.OK).json({
    message: `Feedback status updated to ${status}.`,
    feedback: updatedFeedback,
  });
});

// @desc    Delete a feedback entry
// @route   DELETE /api/v1/feedback/:id
// @access  Private (Admin only)
export const deleteFeedback = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid Feedback ID format.");
  }

  const feedback = await Feedback.findById(req.params.id);

  if (!feedback) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Feedback entry not found.");
  }

  await Feedback.deleteOne({ _id: req.params.id });

  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "Feedback entry deleted successfully." });
});
