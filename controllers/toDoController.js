import asyncHandler from "express-async-handler";
import { StatusCodes } from "http-status-codes";
import { Todo } from "../models/toDoSchema.js";
import { User } from "../models/userModel.js";
import { StudyList } from "../models/studyListModel.js";

// @desc    Create a new Todo
// @route   POST /api/v1/todos
// @access  Private
export const createTodo = asyncHandler(async (req, res) => {
  const { title, description, dueDate, priority, studyListId } = req.body;
  // console.log(studyListId);

  if (!title) {
    res.status(StatusCodes.BAD_REQUEST);
    throw new Error("Title is a required field for a ToDo!");
  }

  let studyList = null;
  if (studyListId) {
    studyList = await StudyList.findById(studyListId);
    if (!studyList) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Specified Study List not found.");
    }

    if (studyList.createdBy.toString() !== req.user._id.toString()) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error(
        "You are not authorized to add a ToDo to this Study List."
      );
    }
  }

  const todo = await Todo.create({
    title,
    description: description || null,
    dueDate: dueDate || null,
    priority: priority || "medium",
    createdBy: req.user._id,
    studyList: studyListId || null,
  });

  await User.findByIdAndUpdate(req.user._id, {
    $push: { todos: todo._id },
  });

  if (studyList) {
    await StudyList.findByIdAndUpdate(studyListId, {
      $push: { todos: todo._id },
    });
  }

  const populatedTodo = await Todo.findById(todo._id)
    .populate("createdBy", "name email")
    .populate("studyList", "title description");
  console.log(populatedTodo);

  res.status(StatusCodes.CREATED).json(populatedTodo);
});

// @desc    Get all Todos for the logged-in user
// @route   GET /api/v1/todos/me
// @access  Private
export const getUserTodos = asyncHandler(async (req, res) => {
  const todos = await Todo.find({ createdBy: req.user._id })
    .populate("createdBy", "name email")
    .populate("studyList")
    .sort({ createdAt: -1 });

  res.status(StatusCodes.OK).json(todos);
});

// @desc    Get a single Todo by ID for the logged-in user
// @route   GET /api/v1/todos/:id
// @access  Private
export const getTodoById = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id)
    .populate("createdBy", "name email")
    .populate("studyList");

  if (!todo) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("ToDo not found.");
  }

  if (todo.createdBy._id.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to view this ToDo.");
  }

  res.status(StatusCodes.OK).json(todo);
});

// @desc    Update an existing Todo
// @route   PUT /api/v1/todos/:id
// @access  Private
export const updateTodo = asyncHandler(async (req, res) => {
  const { title, description, dueDate, priority, status, studyList } = req.body;
  const studyListId = studyList;

  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("ToDo not found.");
  }

  if (todo.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to update this ToDo.");
  }

  let newStudyList = null;

  if (
    studyListId &&
    todo.studyList &&
    studyListId !== todo.studyList.toString()
  ) {
    await StudyList.findByIdAndUpdate(todo.studyList, {
      $pull: { todos: todo._id },
    });

    newStudyList = await StudyList.findById(studyListId);
    if (!newStudyList) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("New Study List not found.");
    }
    if (newStudyList.createdBy.toString() !== req.user._id.toString()) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("You are not authorized to link to this new Study List.");
    }
    await StudyList.findByIdAndUpdate(studyListId, {
      $push: { todos: todo._id },
    });
    todo.studyList = studyListId;
  } else if (studyListId === null && todo.studyList) {
    await StudyList.findByIdAndUpdate(todo.studyList, {
      $pull: { todos: todo._id },
    });
    todo.studyList = null;
  } else if (studyListId && !todo.studyList) {
    newStudyList = await StudyList.findById(studyListId);
    if (!newStudyList) {
      res.status(StatusCodes.NOT_FOUND);
      throw new Error("Study List not found.");
    }
    if (newStudyList.createdBy.toString() !== req.user._id.toString()) {
      res.status(StatusCodes.FORBIDDEN);
      throw new Error("You are not authorized to link to this Study List.");
    }
    await StudyList.findByIdAndUpdate(studyListId, {
      $push: { todos: todo._id },
    });
    todo.studyList = studyListId;
  }

  todo.title = title || todo.title;
  todo.description = description === undefined ? todo.description : description;
  todo.dueDate = dueDate === undefined ? todo.dueDate : dueDate;
  todo.priority = priority || todo.priority;
  todo.status = status || todo.status;

  const updatedTodo = await todo.save();

  const populatedTodo = await Todo.findById(updatedTodo._id)
    .populate("createdBy", "name email")
    .populate("studyList");

  res.status(StatusCodes.OK).json(populatedTodo);
});

// @desc    Delete a Todo
// @route   DELETE /api/v1/todos/:id
// @access  Private
export const deleteTodo = asyncHandler(async (req, res) => {
  const todo = await Todo.findById(req.params.id);

  if (!todo) {
    res.status(StatusCodes.NOT_FOUND);
    throw new Error("ToDo not found.");
  }

  if (todo.createdBy.toString() !== req.user._id.toString()) {
    res.status(StatusCodes.FORBIDDEN);
    throw new Error("You are not authorized to delete this ToDo.");
  }

  await User.findByIdAndUpdate(req.user._id, {
    $pull: { todos: todo._id },
  });

  await Todo.deleteOne({ _id: req.params.id });

  res
    .status(StatusCodes.NO_CONTENT)
    .json({ message: "ToDo deleted successfully" });
});
