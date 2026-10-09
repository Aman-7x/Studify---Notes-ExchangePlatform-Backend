// ./controllers/courseController.js
import mongoose from "mongoose";
import { University } from "../models/universityModel.js";
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Course } from "../models/courseModel.js";
import { User } from "../models/userModel.js";
import { Note } from "../models/notesModel.js";

// @desc    Get all courses (with optional filters)
// @route   GET /api/v1/courses
// @access  Public
export const getAllCourses = asyncHandler(async (req, res) => {
  const { universityId, branch, search } = req.query;
  const query = {};

  if (universityId) {
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid University ID format.");
    }
    const universityExists = await University.findById(universityId);
    if (!universityExists) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("University not found for the provided ID.");
    }
    query.university = universityId;
  }
  if (branch) query.branch = branch;
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const courses = await Course.find(query)
    .populate("university", "name")
    .populate("createdBy", "firstName lastName")
    .sort({ name: 1 });
  res.status(StatusCodes.OK).json(courses);
});

// @desc    Get a single course by ID
// @route   GET /api/v1/courses/:id
// @access  Public
export const getCourseById = asyncHandler(async (req, res) => {
  const course = await Course.findById(req.params.id)
    .populate("university", "name location")
    .populate("notes")
    .populate("followers", "firstName lastName");
  if (!course) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Course not found.");
  }
  res.status(StatusCodes.OK).json(course);
});

// @desc    Get courses for a specific university
// @route   GET /api/v1/courses/university/:universityId
// @access  Public
export const getCoursesByUniversity = asyncHandler(async (req, res) => {
  const { universityId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(universityId)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid University ID format.");
  }

  const universityExists = await University.findById(universityId);
  if (!universityExists) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("University not found.");
  }

  const courses = await Course.find({ university: universityId })
    .populate("university", "name")
    .sort({ name: 1 });
  res.status(StatusCodes.OK).json(courses);
});

// @desc    User follows a course
// @route   POST /api/v1/courses/:id/follow
// @access  Private
export const followCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  const course = await Course.findById(courseId);
  const user = await User.findById(userId);

  if (!course) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Course not found.");
  }
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("User not found.");
  }

  if (user.followedCourses.includes(courseId)) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("You are already following this course.");
  }
  if (course.followers.includes(userId)) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("This course already has you as a follower.");
  }

  user.followedCourses.push(courseId);
  await user.save();

  course.followers.push(userId);
  await course.save();

  res
    .status(StatusCodes.OK)
    .json({ message: "Course followed successfully!", course });
});

// @desc    User unfollows a course
// @route   DELETE /api/v1/courses/:id/unfollow
// @access  Private
export const unfollowCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const userId = req.user._id;

  const course = await Course.findById(courseId);
  const user = await User.findById(userId);

  if (!course) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Course not found.");
  }
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("User not found.");
  }

  if (!user.followedCourses.includes(courseId)) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("You are not following this course.");
  }
  if (!course.followers.includes(userId)) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("You are not listed as a follower for this course.");
  }

  user.followedCourses = user.followedCourses.filter(
    (id) => id.toString() !== courseId.toString()
  );
  await user.save();

  course.followers = course.followers.filter(
    (id) => id.toString() !== userId.toString()
  );
  await course.save();

  res
    .status(StatusCodes.OK)
    .json({ message: "Course unfollowed successfully!", course });
});

// @desc    Get courses followed by the logged-in user
// @route   GET /api/v1/courses/my-followed
// @access  Private
export const getLoggedInUserFollowedCourses = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const user = await User.findById(userId).populate(
    "followedCourses",
    "name code description university"
  ); // Populate followed courses

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found.");
  }

  res.status(StatusCodes.OK).json(user.followedCourses);
});

// @desc    Create a new course
// @route   POST /api/v1/courses
// @access  Private 
export const createCourse = asyncHandler(async (req, res) => {
  const { name, code, description, university, branch } = req.body;

  // 1. Validate input
  if (!name || !code || !university) {
    // console.log(name, code, university);

    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(
      "Name, code, and university ID are required to create a course."
    );
  }
  // console.log("run 0");
  if (!mongoose.Types.ObjectId.isValid(university)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid University ID format.");
  }
  // console.log("run 1");

  const university1 = await University.findById(university);
  if (!university1) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("University not found with the provided ID.");
  }

  const courseExists = await Course.findOne({
    $or: [
      {
        name: { $regex: new RegExp(`^${name}$`, "i") },
        university: university,
      },
      {
        code: { $regex: new RegExp(`^${code}$`, "i") },
        university: university,
      },
    ],
  });
  if (courseExists) {
    res.status(StatusCodes.CONFLICT);
    throw new Error(
      "A course with this name or code already exists for this university."
    );
  }
  // console.log("runin");

  const course = await Course.create({
    name,
    createdBy: req.user.id,
    code,
    description: description || null,
    university: university,
    branch: branch || null,
  });

  university1.courses.push(course._id);
  await university1.save();

  const user = await User.findById(req.user._id);
  user.courses.push(course._id);
  await user.save();

  res.status(StatusCodes.CREATED).json({
    message: "Course created successfully",
    course,
  });
});

// @desc    Update an existing course
// @route   PUT /api/v1/courses/:id
// @access  Private (Admin only)
export const updateCourse = asyncHandler(async (req, res) => {
  const { name, code, description, universityId, branch } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid Course ID format.");
  }

  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Course not found.");
  }

  let newUniversity = null;
  if (universityId && universityId !== course.university.toString()) {
    if (!mongoose.Types.ObjectId.isValid(universityId)) {
      res.status(StatusCodes.BAD_REQUEST);
      throw new Error("Invalid new University ID format.");
    }
    newUniversity = await University.findById(universityId);
    if (!newUniversity) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("New university not found.");
    }
    await University.findByIdAndUpdate(course.university, {
      $pull: { courses: course._id },
    });
    newUniversity.courses.push(course._id);
    await newUniversity.save();
    course.university = universityId;
  }

  if ((name && name !== course.name) || (code && code !== course.code)) {
    const targetUniversityId = newUniversity
      ? newUniversity._id
      : course.university;
    const conflictQuery = {
      _id: { $ne: req.params.id },
      university: targetUniversityId,
      $or: [],
    };
    if (name)
      conflictQuery.$or.push({
        name: { $regex: new RegExp(`^${name}$`, "i") },
      });
    if (code)
      conflictQuery.$or.push({
        code: { $regex: new RegExp(`^${code}$`, "i") },
      });

    const nameCodeConflict = await Course.findOne(conflictQuery);
    if (nameCodeConflict) {
      res.status(StatusCodes.CONFLICT);
      throw new Error(
        "Another course with this name or code already exists for this university."
      );
    }
  }

  course.name = name || course.name;
  course.code = code || course.code;
  course.description =
    description !== undefined ? description : course.description;
  course.branch = branch !== undefined ? branch : course.branch;

  const updatedCourse = await course.save();

  res.status(StatusCodes.OK).json({
    message: "Course updated successfully",
    course: updatedCourse,
  });
});

// @desc    Delete a course
// @route   DELETE /api/v1/courses/:id
// @access  Private (Admin only)
export const deleteCourse = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid Course ID format.");
  }

  const course = await Course.findById(req.params.id);

  if (!course) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Course not found.");
  }

  const associatedNotesCount = await Note.countDocuments({
    course: req.params.id,
  });
  if (associatedNotesCount > 0) {
    res.status(StatusCodes.CONFLICT);
    throw new Error(
      `Cannot delete course: ${associatedNotesCount} associated notes exist. Please delete or reassign notes first.`
    );
  }

  await University.findByIdAndUpdate(course.university, {
    $pull: { courses: course._id },
  });

  await User.updateMany(
    { followedCourses: course._id },
    { $pull: { followedCourses: course._id } }
  );

  await Course.deleteOne({ _id: req.params.id });

  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "Course deleted successfully." });
});
