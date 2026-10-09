// ./controllers/studyListController.js
import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { StudyList } from "../models/studyListModel.js";
import { User } from "../models/userModel.js";
import { Note } from "../models/notesModel.js"; // Import Note model
import { Todo } from "../models/toDoSchema.js"; // Import Todo model

// @desc    Create a new Study List
// @route   POST /api/v1/study-lists
// @access  Private
export const createStudyList = asyncHandler(async (req, res) => {
  const { title, description, isPublic, notes } = req.body;

  if (!title) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Study List title is required.");
  }
  const foundNotes = await Note.find({
    _id: { $in: notes },
  });

  if (!foundNotes) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("One or more of the specified notes could not be found.");
  }
  const noteIds = foundNotes.map((note) => note._id);

  const studyList = await StudyList.create({
    title,
    description: description || null,
    isPublic: isPublic !== undefined ? isPublic : false,
    notes: noteIds,
    createdBy: req.user._id,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { savedStudyLists: studyList._id },
  });
  console.log(studyList);

  res.status(StatusCodes.CREATED).json(studyList);
});

export const getStudyLists = asyncHandler(async (req, res) => {
  const search = req.query.search?.toLowerCase() || "";

  const query = { isPublic: true };

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const studyLists = await StudyList.find(query)
    .populate("createdBy")
    .populate("notes")
    .populate("todos")
    .sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json(studyLists);
});
// @desc    Get all Study Lists for the logged-in user
// @route   GET /api/v1/study-lists/me
// @access  Private
export const getUserStudyLists = asyncHandler(async (req, res) => {
  const studyLists = await StudyList.find({ createdBy: req.user._id })
    .populate("notes")
    .populate("todos")
    .populate("createdBy")
    .sort({ createdAt: -1 });
  console.log(studyLists);

  res.status(StatusCodes.OK).json(studyLists);
});

// @desc    Get all public Study Lists
// @route   GET /api/v1/study-lists/public
// @access  Public
export const getPublicStudyLists = asyncHandler(async (req, res) => {
  const publicStudyLists = await StudyList.find({ isPublic: true })
    .populate("createdBy", "firstName lastName university profilePic")
    .populate("notes")
    .populate("todos")
    .populate("createdBy")
    .sort({ createdAt: -1 });
  if (!publicStudyLists || publicStudyLists.length === 0) {
    return res.status(StatusCodes.OK).json([]);
  }

  res.status(StatusCodes.OK).json(publicStudyLists);
});

// @desc    Get a single Study List by ID for the logged-in user
// @route   GET /api/v1/study-lists/:id
// @access  Private
export const getStudyListById = asyncHandler(async (req, res) => {
  // console.log("run");
  // console.log(req.params.id);

  const studyList = await StudyList.findById(req.params.id)
    .populate("notes")
    .populate("todos")
    .populate("createdBy");

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }

  res.status(StatusCodes.OK).json(studyList);
});

// @desc    Update an existing Study List
// @route   PUT /api/v1/study-lists/:id
// @access  Private
export const updateStudyList = asyncHandler(async (req, res) => {
  const { title, description, isPublic, notes } = req.body;
  const { id: studyListId } = req.params;

  const studyList = await StudyList.findById(studyListId);

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }

  if (studyList.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to update this Study List.");
  }

  if (title) {
    studyList.title = title;
  }
  if (description !== undefined) {
    studyList.description = description;
  }
  if (isPublic !== undefined) {
    studyList.isPublic = isPublic;
  }
  if (notes) {
    studyList.notes = notes;
  }

  const updatedStudyList = await studyList.save();

  res.status(StatusCodes.OK).json({
    message: "Study List updated successfully!",
    studyList: updatedStudyList,
  });
});

// @desc    Delete a Study List
// @route   DELETE /api/v1/study-lists/:id
// @access  Private
export const deleteStudyList = asyncHandler(async (req, res) => {
  const studyList = await StudyList.findById(req.params.id);

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }

  if (studyList.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to delete this Study List.");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { savedStudyLists: studyList._id },
  });

  await Todo.updateMany({ folder: studyList._id }, { $set: { folder: null } });

  await StudyList.deleteOne({ _id: req.params.id });

  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "Study List deleted successfully." });
});

// @desc    Add a Note to a Study List
// @route   POST /api/v1/study-lists/:id/notes/:noteId
// @access  Private
export const addNoteToStudyList = asyncHandler(async (req, res) => {
  const { id: studyListId, noteId } = req.params;

  const studyList = await StudyList.findById(studyListId);
  const note = await Note.findById(noteId);

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }
  if (!note) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note not found.");
  }

  if (studyList.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to modify this Study List.");
  }

  if (studyList.notes.includes(noteId)) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("Note is already in this Study List.");
  }

  studyList.notes.push(noteId);
  const updatedStudyList = await studyList.save();

  res
    .status(StatusCodes.OK)
    .json({
      message: "Note added to Study List.",
      studyList: updatedStudyList,
    });
});

export const getSavedNotesStatus = asyncHandler(async (req, res) => {
  const { noteIds } = req.body;
  const userId = req.user._id;

  if (!noteIds || !Array.isArray(noteIds)) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("An array of noteIds is required.");
  }

  const studylists = await StudyList.find({
    createdBy: userId,
    notes: { $in: noteIds },
  }).select("notes");

  const savedNoteIds = new Set();
  studylists.forEach((list) => {
    list.notes.forEach((noteId) => {
      savedNoteIds.add(noteId.toString());
    });
  });

  res.status(StatusCodes.OK).json(Array.from(savedNoteIds));
});

// @desc    Remove a Note from a Study List
// @route   DELETE /api/v1/study-lists/:id/notes/:noteId
// @access  Private
export const removeNoteFromStudyList = asyncHandler(async (req, res) => {
  const { id: studyListId, noteId } = req.params;

  const studyList = await StudyList.findById(studyListId);

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }

  if (studyList.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to modify this Study List.");
  }

  if (!studyList.notes.includes(noteId)) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Note is not in this Study List.");
  }

  studyList.notes = studyList.notes.filter(
    (note) => note.toString() !== noteId
  );
  const updatedStudyList = await studyList.save();

  res
    .status(StatusCodes.OK)
    .json({
      message: "Note removed from Study List.",
      studyList: updatedStudyList,
    });
});

// @desc    Add a Todo to a Study List
// @route   POST /api/v1/study-lists/:id/todos/:todoId
// @access  Private
export const addTodoToStudyList = asyncHandler(async (req, res) => {
  const { id: studyListId, todoId } = req.params;

  const studyList = await StudyList.findById(studyListId);
  const todo = await Todo.findById(todoId);

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }
  if (!todo) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Todo not found.");
  }

  if (studyList.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to modify this Study List.");
  }

  if (todo.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You can only add your own Todos to Study Lists.");
  }

  if (studyList.todos.includes(todoId)) {
    res.status(StatusCodes.CONFLICT);
    throw new Error("Todo is already in this Study List.");
  }

  if (todo.folder && todo.folder.toString() !== studyListId) {
    await StudyList.findByIdAndUpdate(todo.folder, {
      $pull: { todos: todo._id },
    });
  }

  studyList.todos.push(todoId);
  const updatedStudyList = await studyList.save();

  todo.studyList = studyListId;
  await todo.save();

  res
    .status(StatusCodes.OK)
    .json({
      message: "Todo added to Study List.",
      studyList: updatedStudyList,
    });
});

// @desc    Remove a Todo from a Study List
// @route   DELETE /api/v1/study-lists/:id/todos/:todoId
// @access  Private
export const removeTodoFromStudyList = asyncHandler(async (req, res) => {
  const { id: studyListId, todoId } = req.params;

  const studyList = await StudyList.findById(studyListId);
  const todo = await Todo.findById(todoId);

  if (!studyList) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Study List not found.");
  }
  if (!todo) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Todo not found.");
  }

  if (studyList.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to modify this Study List.");
  }
  if (todo.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You can only remove your own Todos from Study Lists.");
  }

  if (!studyList.todos.includes(todoId)) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("Todo is not in this Study List.");
  }

  studyList.todos = studyList.todos.filter((t) => t.toString() !== todoId);
  const updatedStudyList = await studyList.save();

  todo.studyList = null;
  await todo.save();

  res
    .status(StatusCodes.OK)
    .json({
      message: "Todo removed from Study List.",
      studyList: updatedStudyList,
    });
});
