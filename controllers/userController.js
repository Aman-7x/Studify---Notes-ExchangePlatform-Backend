import cloudinary from "cloudinary";
import fs from "fs";
import asyncHandler from "express-async-handler";
import {StatusCodes } from "http-status-codes";
import { User } from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Note } from "../models/notesModel.js";
import { Todo } from "../models/toDoSchema.js";
import { StudyList } from "../models/studyListModel.js";
import { Course } from "../models/courseModel.js";
import { Feedback } from "../models/feedbackModel.js";

// @desc    Verify user
// @route   get /api/users/verify
// @access  private

export const verifyMe = asyncHandler(async (req, res) => {
  // console.log(req.user);
  res.json({ valid: true, user: req.user });
});

// @desc    Register a new user
// @route   POST /api/v1/users/signup
// @access  Public
export const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, password, university, bio } = req.body;

  if (!firstName || !lastName || !email || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error(
      "All mandatory fields (firstName, lastName, email, password) are required"
    );
  }

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("User with this email already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    university: university || null,
    bio: bio || "",
  });

  if (user) {
    const token = jwt.sign(
      {
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
      },
      process.env.JWT_SECRET,
      { expiresIn: "5h" }
    );

    res.cookie("token", token);

    res.status(StatusCodes.CREATED).json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      message: "User registered successfully",
      token: token,
    });
  } else {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    throw new Error("User data is not valid");
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/v1/users/signin
// @access  Public
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid credentials");
  }

  const token = jwt.sign(
    {
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    },
    process.env.JWT_SECRET,
    { expiresIn: "5h" }
  );

  res.cookie("token", token);

  res.status(StatusCodes.OK).json({
    _id: user._id,
    firstName: user.firstName,
    email: user.email,
    message: "Logged in successfully",
    token: token,
  });
});

// @desc    Logout user
// @route   POST /api/v1/users/logout
// @access  Private
export const logoutUser = asyncHandler(async (req, res) => {
  res.clearCookie("token");
  res.status(StatusCodes.OK).json({ message: "Logged out successfully" });
});

// @desc    Get current user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getUserProfile = asyncHandler(async (req, res) => {
  if (req.user) {
    const user = await User.findById(req.user._id)
      .populate("uploadedNotes")
      .populate("todos")
      .populate("followedCourses")
      .populate("savedStudyLists")
      .populate("courses");
    res.status(StatusCodes.OK).json(user);
  } else {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
});

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;

    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({
        email: req.body.email.toLowerCase(),
      });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        res.status(StatusCodes.CONFLICT);
        throw new Error("Email already registered by another user");
      }
      user.email = req.body.email.toLowerCase();
    }
    if (req.body.university) {
      user.university = user.university || {};
      user.university.name = req.body.university.name || user.university.name;
      user.university.startYear =
        req.body.university.startYear || user.university.startYear;
    }

    if (req.body.bio !== undefined) {
      user.bio = req.body.bio;
    }

    const updatedUser = await user.save();

    res.status(StatusCodes.OK).json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      university: updatedUser.university,
      bio: updatedUser.bio, // YAHAN EDIT KIYA GAYA HAI (Step 4)
      message: "Profile updated successfully",
    });
  } else {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
});

// @desc    Change user password
// @route   PUT /api/v1/users/profile/password
// @access  Private
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Both current password and new password are required");
  }
  if (newPassword.length < 6) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("New password must be at least 6 characters long");
  }

  const user = await User.findById(req.user._id);

  if (user && (await bcrypt.compare(currentPassword, user.password))) {
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res
      .status(StatusCodes.OK)
      .json({ message: "Password updated successfully" });
  } else {
    res.status(StatusCodes.UNAUTHORIZED);
    throw new Error("Invalid current password");
  }
});

// @desc    Upload user profile picture
// @route   POST /api/v1/users/profile/upload-pic
// @access  Private
export const uploadProfilePic = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("No file uploaded");
  }

  // console.log(req.file.path);

  const result = await cloudinary.v2.uploader.upload(req.file.path, {
    folder: "profile_pics",
    resource_type: "image",
  });

  // console.log(result);

  fs.unlinkSync(req.file.path);

  const user = await User.findById(req.user._id);
  if (user) {
    if (user.profilePic && user.profilePic.publicId) {
      await cloudinary.v2.uploader.destroy(user.profilePic.publicId);
    }
    user.profilePic = {
      url: result.secure_url,
      publicId: result.public_id,
    };
    await user.save();
    res.status(StatusCodes.OK).json({
      message: "Profile picture uploaded successfully",
      profilePic: user.profilePic,
    });
  } else {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found");
  }
});

// @desc    User deletes their own account
// @route   DELETE /api/v1/users/profile
// @access  Private
export const deleteMyAccount = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);
  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found.");
  }

  if (user.profilePic && user.profilePic.publicId) {
    await cloudinary.v2.uploader.destroy(user.publicId);
  }
  await Note.deleteMany({ uploadedBy: userId });

  await Todo.deleteMany({ createdBy: userId });

  await StudyList.deleteMany({ createdBy: userId });

  await Course.updateMany(
    { followers: userId },
    { $pull: { followers: userId } }
  );

  await Note.updateMany(
    { $or: [{ likes: userId }, { dislikes: userId }] },
    { $pull: { likes: userId, dislikes: userId } }
  );

  await Feedback.deleteMany({ submittedBy: userId });

  await User.deleteOne({ _id: userId });
  res.clearCookie("token");
  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "Account deleted successfully." });
});

// @desc    Get all users (for admin dashboard)
// @route   GET /api/v1/admin/users/
// @access  Private (Admin only)
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select("-password").sort({ createdAt: -1 });
  res.status(StatusCodes.OK).json(users);
});

// @desc    Get a single user by ID (for admin)
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin only)
export const getUserById = asyncHandler(async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid User ID format.");
  }

  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("uploadedNotes", "title fileUrl")
    .populate("todos", "title status")
    .populate("followedCourses", "name code")
    .populate("savedStudyLists", "title");

  if (!user) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found.");
  }

  res.status(StatusCodes.OK).json(user);
});

// @desc    Update a user's role (admin can change user role)
// @route   PUT /api/v1/admin/users/:id/role
// @access  Private (Admin only)
export const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid User ID format.");
  }

  if (!role || !["user", "admin"].includes(role)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid role provided. Role must be 'user' or 'admin'.");
  }

  const userToUpdate = await User.findById(req.params.id);

  if (!userToUpdate) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found.");
  }

  if (
    userToUpdate._id.toString() === req.user._id.toString() &&
    role === "user"
  ) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("An admin cannot demote their own account.");
  }

  userToUpdate.role = role;
  const updatedUser = await userToUpdate.save();

  res.status(StatusCodes.OK).json({
    message: `User ${updatedUser.email}'s role updated to ${updatedUser.role}.`,
    user: {
      _id: updatedUser._id,
      email: updatedUser.email,
      role: updatedUser.role,
    },
  });
});

// @desc    Admin deletes any user
// @route   DELETE /api/v1/admin/users/:id
// @access  Private (Admin only)
export const deleteUser = asyncHandler(async (req, res) => {
  const userIdToDelete = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(userIdToDelete)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Invalid User ID format.");
  }

  const userToDelete = await User.findById(userIdToDelete);
  if (!userToDelete) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("User not found.");
  }

  if (userToDelete._id.toString() === req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error(
      "An admin cannot delete their own account via this endpoint."
    );
  }
  if (userToDelete.role === "admin" && req.user.role === "admin") {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("Admin cannot delete another admin account.");
  }

  const uploadedNotes = await Note.find({ uploadedBy: userIdToDelete });
  for (const note of uploadedNotes) {
    const filePath = path.join(process.cwd(), note.fileUrl);
    if (fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error(`Error deleting note file ${filePath}:`, err);
      });
    }
    if (note.course) {
      await Course.findByIdAndUpdate(note.course, {
        $pull: { notes: note._id },
      });
    }
    await StudyList.updateMany(
      { notes: note._id },
      { $pull: { notes: note._id } }
    );
  }
  await Note.deleteMany({ uploadedBy: userIdToDelete });

  const userTodos = await Todo.find({ createdBy: userIdToDelete });
  for (const todo of userTodos) {
    if (todo.folder) {
      await StudyList.findByIdAndUpdate(todo.folder, {
        $pull: { todos: todo._id },
      });
    }
  }
  await Todo.deleteMany({ createdBy: userIdToDelete });

  await StudyList.deleteMany({ createdBy: userIdToDelete });

  await Course.updateMany(
    { followers: userIdToDelete },
    { $pull: { followers: userIdToDelete } }
  );

  await Note.updateMany(
    { $or: [{ likes: userIdToDelete }, { dislikes: userIdToDelete }] },
    { $pull: { likes: userIdToDelete, dislikes: userIdToDelete } }
  );

  await Feedback.deleteMany({ submittedBy: userIdToDelete });

  if (userToDelete.profilePic) {
    const profilePicPath = path.join(process.cwd(), userToDelete.profilePic);
    if (fs.existsSync(profilePicPath)) {
      fs.unlink(profilePicPath, (err) => {
        if (err)
          console.error(`Error deleting profile pic ${profilePicPath}:`, err);
      });
    }
  }
  await User.deleteOne({ _id: userIdToDelete });
  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "User and all associated data deleted successfully." });
});
