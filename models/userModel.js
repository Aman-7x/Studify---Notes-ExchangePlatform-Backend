import mongoose from "mongoose";

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    university: {
      name: { type: String, trim: true },
      startYear: Number,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 250,
    },
    profilePic: {
      url: String,
      publicId: String,
    },

    downloadRemaining: { type: Number, default: 3 },
    uploadedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
    todos: [{ type: mongoose.Schema.Types.ObjectId, ref: "Todo" }],
    likedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
    dislikedNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
    followedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    savedStudyLists: [
      { type: mongoose.Schema.Types.ObjectId, ref: "StudyList" },
    ],
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  },
);

export const User = mongoose.model("User", userSchema);
