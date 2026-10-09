import mongoose from "mongoose";

const notesSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    file: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    university: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "University",
      required: true,
    },
    branch: { type: String, trim: true },
    year: { type: String, trim: true },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    downloadCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  },
);

export const Note = mongoose.model("Note", notesSchema);
