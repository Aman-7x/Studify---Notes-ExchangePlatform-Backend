import mongoose from "mongoose";

const universitySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    location: { type: String, trim: true },
    website: { type: String, trim: true },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  },
  {
    timestamps: true,
  },
);

export const University = mongoose.model("University", universitySchema);
