// ./controllers/universityController.js
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { University } from "../models/universityModel.js"; // Import University model
import { Course } from "../models/courseModel.js"; // Import Course model (to populate courses)

// @desc    Get all universities
// @route   GET /api/v1/universities
// @access  Public
export const getAllUniversities = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const query = {};

  if (search) {
    query.name = { $regex: search, $options: "i" };
  }

  const universities = await University.find(query).sort({ name: 1 });

  res.status(StatusCodes.OK).json(universities);
});

// @desc    Get a single university by ID
// @route   GET /api/v1/universities/:id
// @access  Public
export const getUniversityById = asyncHandler(async (req, res) => {
  const university = await University.findById(req.params.id).populate(
    "courses",
    "name code description"
  );

  if (!university) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("University not found.");
  }

  res.status(StatusCodes.OK).json(university);
});

// --- ADMIN-ONLY FUNCTIONS ---

// @desc    Create a new university
// @route   POST /api/v1/universities
// @access  Private (Admin only)
export const createUniversity = asyncHandler(async (req, res) => {
  const { name, location, website } = req.body;

  if (!name) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("University name is required.");
  }

  const universityExists = await University.findOne({
    name: { $regex: new RegExp(`^${name}$`, "i") },
  }); // Case-insensitive exact match
  if (universityExists) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("A university with this name already exists.");
  }

  const university = await University.create({
    name,
    location: location || null,
    website: website || null,
  });

  res.status(StatusCodes.CREATED).json({
    message: "University created successfully",
    university,
  });
});

// @desc    Update an existing university
// @route   PUT /api/v1/universities/:id
// @access  Private (Admin only)
export const updateUniversity = asyncHandler(async (req, res) => {
  const { name, location, website } = req.body;

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid University ID format.");
  }

  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("University not found.");
  }

  if (name && name !== university.name) {
    const nameConflict = await University.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
      _id: { $ne: req.params.id },
    });
    if (nameConflict) {
      res.status(StatusCodes.CONFLICT);
      throw new Error("Another university with this name already exists.");
    }
  }

  university.name = name || university.name;
  university.location = location !== undefined ? location : university.location;
  university.website = website !== undefined ? website : university.website;

  const updatedUniversity = await university.save();

  res.status(StatusCodes.OK).json({
    message: "University updated successfully",
    university: updatedUniversity,
  });
});

// @desc    Delete a university
// @route   DELETE /api/v1/universities/:id
// @access  Private (Admin only)
export const deleteUniversity = asyncHandler(async (req, res) => {
  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid University ID format.");
  }

  const university = await University.findById(req.params.id);

  if (!university) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("University not found.");
  }

  const associatedCoursesCount = await Course.countDocuments({
    university: req.params.id,
  });
  if (associatedCoursesCount > 0) {
    res.status(StatusCodes.CONFLICT);
    throw new Error(
      `Cannot delete university: ${associatedCoursesCount} associated courses exist. Please delete or reassign courses first.`
    );
  }

  await University.deleteOne({ _id: req.params.id });

  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "University deleted successfully." }); // 204 No Content
});
