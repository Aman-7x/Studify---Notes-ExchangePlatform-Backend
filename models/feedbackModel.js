import mongoose from "mongoose";

const feedbackSchema = mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      minlength: [3, "Subject must be at least 3 characters long"],
    },
    message: {
      type: String,
      required: true,
      trim: true,
      minlength: [10, "Message must be at least 10 characters long"],
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      enum: ["Bug Report", "Feature Request", "General Feedback", "Other"],
      default: "General Feedback",
    },
    status: {
      type: String,
      enum: ["Pending", "Reviewed", "Resolved"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

export const Feedback = mongoose.model("Feedback", feedbackSchema);
