import cloudinary from "cloudinary";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Note } from "../models/notesModel.js";
import { User } from "../models/userModel.js";
import { Course } from "../models/courseModel.js";
import { University } from "../models/universityModel.js";
import axios from "axios";
import fs from "fs";

// @desc    Upload a new note
// @route   POST /api/v1/notes/upload
// @access  Private
export const uploadNote = asyncHandler(async (req, res) => {
  const { title, description, courseId, universityId, branch, year } = req.body;

  if (!req.file) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("No file uploaded. Please select a file.");
  }

  if (!title || !description || !courseId || !universityId) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(
      "Title, description, courseId, and universityId are required."
    );
  }

  const result = await cloudinary.v2.uploader.upload(req.file.path, {
    resource_type: "image",
    folder: "notes",
  });

  fs.unlinkSync(req.file.path);

  const course = await Course.findById(courseId);
  const university = await University.findById(universityId);

  if (!course) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Course not found.");
  }
  if (!university) {
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Error deleting file:", err);
    });
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("University not found.");
  }

  // const fileUrl = `/uploads/notes/${req.file.filename}`;

  const note = await Note.create({
    title,
    description,
    file: {
      url: result.secure_url,
      publicId: result.public_id,
    },
    course: courseId,
    university: universityId,
    branch: branch || null,
    year: year || null,
    uploadedBy: req.user._id,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { uploadedNotes: note._id },
  });

  await Course.findByIdAndUpdate(courseId, {
    $push: { notes: note._id },
  });

  const user = await User.findById({ _id: req.user._id });

  if (user.downloadRemaining < 3) {
    user.downloadRemaining += 1;
  }
  await user.save();

  res.status(StatusCodes.CREATED).json({
    message: "Note uploaded successfully",
    note: note,
  });
});

// @desc    Get all notes (with optional filters)
// @route   GET /api/v1/notes
// @access  Public
export const getAllNotes = asyncHandler(async (req, res) => {
  const { universityId, courseId, branch, year, search } = req.query;
  const query = {};

  if (universityId) query.university = universityId;
  if (courseId) query.course = courseId;
  if (branch) query.branch = branch;
  if (year) query.year = year;

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const notes = await Note.find(query)
    .populate("uploadedBy", "firstName lastName profilePic")
    .populate("course", "name code")
    .populate("university", "name")
    .sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json(notes);
});

// @desc    Get a single note by ID
// @route   GET /api/v1/notes/:id
// @access  Public
export const getNoteById = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id)
    .populate("uploadedBy")
    .populate("course")
    .populate("university")
    .populate("createdAt");

  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note not found");
  }

  res.status(StatusCodes.OK).json(note);
});

// @desc    Update a note (only by uploader or admin)
// @route   PUT /api/v1/notes/:id
// @access  Private
export const updateNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new new Error("Note not found")();
  }

  if (note.uploadedBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("User not authorized to update this note");
  }

  note.title = req.body.title || note.title;
  note.description = req.body.description || note.description;
  note.branch = req.body.branch || note.branch;
  note.year = req.body.year || note.year;

  const updatedNote = await note.save();
  res.status(StatusCodes.OK).json({
    message: "Note updated successfully",
    note: updatedNote,
    access_mode: "public",
  });
});

// @desc    Delete a note (only by uploader or admin)
// @route   DELETE /api/v1/notes/:id
// @access  Private
export const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note not found");
  }

  if (
    note.uploadedBy.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("User not authorized to delete this note.");
  }

  await cloudinary.uploader.destroy(note.file.publicId, {
    resource_type: "raw",
  });

  // const filePath = path.join(process.cwd(),"public" , note.fileUrl);
  // if (fs.existsSync(filePath)) {
  //     fs.unlink(filePath, (err) => {
  //         if (err) console.error("Error deleting file from disk:", err);
  //     });
  // }

  await User.findByIdAndUpdate(note.uploadedBy, {
    $pull: { uploadedNotes: note._id },
  });

  await Course.findByIdAndUpdate(note.course, {
    $pull: { notes: note._id },
  });

  await Note.deleteOne({ _id: req.params.id });

  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "Note deleted successfully" });
});

// @desc    Like a note
// @route   POST /api/v1/notes/:id/like
// @access  Private
export const likeNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note not found");
  }

  const userId = req.user._id;

  const dislikedIndex = note.dislikes.findIndex(
    (id) => id.toString() === userId.toString()
  );
  if (dislikedIndex !== -1) {
    note.dislikes.splice(dislikedIndex, 1);

    await User.findByIdAndUpdate(userId, {
      $pull: { dislikedNotes: note._id },
    });
  }

  if (!note.likes.includes(userId)) {
    note.likes.push(userId);

    await User.findByIdAndUpdate(userId, { $push: { likedNotes: note._id } });
  } else {
    const likeIndex = note.likes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    note.likes.splice(likeIndex, 1);
    await User.findByIdAndUpdate(userId, { $pull: { likedNotes: note._id } });
    await note.save();
    return res.status(StatusCodes.OK).json({ message: "Note unliked", note });
  }

  await note.save();
  res.status(StatusCodes.OK).json({ message: "Note liked", note });
});

// @desc    Dislike a note
// @route   POST /api/v1/notes/:id/dislike
// @access  Private
export const dislikeNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note not found");
  }

  const userId = req.user._id;

  const likedIndex = note.likes.findIndex(
    (id) => id.toString() === userId.toString()
  );
  if (likedIndex !== -1) {
    note.likes.splice(likedIndex, 1);
    await User.findByIdAndUpdate(userId, { $pull: { likedNotes: note._id } });
  }

  if (!note.dislikes.includes(userId)) {
    note.dislikes.push(userId);
    await User.findByIdAndUpdate(userId, {
      $push: { dislikedNotes: note._id },
    });
  } else {
    const dislikeIndex = note.dislikes.findIndex(
      (id) => id.toString() === userId.toString()
    );
    note.dislikes.splice(dislikeIndex, 1);
    await User.findByIdAndUpdate(userId, {
      $pull: { dislikedNotes: note._id },
    });
    await note.save();
    return res
      .status(StatusCodes.OK)
      .json({ message: "Note undisliked", note });
  }

  await note.save();
  res.status(StatusCodes.OK).json({ message: "Note disliked", note });
});

// @desc    Download a note
// @route   GET /api/v1/notes/:id/download
// @access  Private
export const downloadNote = asyncHandler(async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note not found");
  }
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }

  if (user.downloadRemaining <= 0) {
    return res.status(StatusCodes.FORBIDDEN).json({
      message:
        "Download limit reached. Please upload a note to get more downloads.",
      code: "LIMIT_EXCEEDED",
    });
  }

  try {
    const fileUrl = note.file.url;
const sanitizedTitle = note.title.replace(/[^\w\s.-]/g, '');
    const response = await axios({
      url: fileUrl,
      method: "GET",
      responseType: "stream",
    });

    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedTitle}.pdf"`);
        res.setHeader('Content-Type', 'application/pdf');

    note.downloadCount = (note.downloadCount || 0) + 1;
    user.downloadRemaining -= 1;
    await note.save();
    await user.save();

    response.data.pipe(res);
  } catch (error) {
    console.error("Error downloading file from Cloudinary:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("Could not download the file.");
  }
});

// @desc    Get notes uploaded by the current logged-in user
// @route   GET /api/v1/notes/my-uploads
// @access  Private
export const getLoggedInUserUploadedNotes = asyncHandler(async (req, res) => {
  // console.log("hey");

  const userId = req.user._id;
  const notes = await Note.find({ uploadedBy: userId })
    .populate("course", "name code")
    .populate("university", "name")
    .sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json(notes);
});

// @desc    Get notes by course ID (can be filtered by university, branch, year)
// @route   GET /api/v1/notes/course/:courseId
// @access  Public
export const getNotesByCourse = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const search = req.query.search?.toLowerCase() || "";

  const query = {
    course: courseId,
  };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const notes = await Note.find(query)
    .populate("uploadedBy", "firstName lastName profilePic")
    .populate("course", "name code")
    .populate("university", "name")
    .sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json(notes);
});

// @desc    Get notes by university ID (can be filtered by course, branch, year)
// @route   GET /api/v1/notes/university/:universityId
// @access  Public
export const getNotesByUniversity = asyncHandler(async (req, res) => {
  const { universityId } = req.params;
  const { courseId, branch, year, search } = req.query;

  const query = { university: universityId };
  if (courseId) query.course = courseId;
  if (branch) query.branch = branch;
  if (year) query.year = year;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const notes = await Note.find(query)
    .populate("uploadedBy", "firstName lastName profilePic")
    .populate("course", "name code")
    .populate("university", "name")
    .sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json(notes);
});

// @desc    Get notes by uploader ID
// @route   GET /api/v1/notes/user/:userId
// @access  Public
export const getNotesByUploader = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const notes = await Note.find({ uploadedBy: userId })
    .populate("course", "name code")
    .populate("university", "name")
    .sort({ createdAt: -1 });

  if (notes.length === 0) {
    return res.status(StatusCodes.OK).json([]);
  }

  res.status(StatusCodes.OK).json(notes);
});

 
