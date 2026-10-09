import mongoose from "mongoose";

const studyListSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: { type: String, trim: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
    todos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Todo" }],
    isPublic: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const StudyList = mongoose.model("StudyList", studyListSchema);
