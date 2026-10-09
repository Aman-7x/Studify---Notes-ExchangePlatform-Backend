import express from "express";
import { validation } from "../middlewares/validity.js";
import {
  createStudyList,
  getStudyListById,
  getUserStudyLists,
  updateStudyList,
  deleteStudyList,
  addNoteToStudyList,
  removeNoteFromStudyList,
  addTodoToStudyList,
  removeTodoFromStudyList,
  getPublicStudyLists,
  getStudyLists,
} from "../controllers/studyListController.js";

const router = express.Router();

router.get("/public", getPublicStudyLists);
router.get("/", getStudyLists);
router.get("/me", validation, getUserStudyLists);
router.post("/", validation, createStudyList);
router.get("/:id", validation, getStudyListById);
router.put("/:id", validation, updateStudyList);
router.delete("/:id", validation, deleteStudyList);

router.post("/:id/notes/:noteId", validation, addNoteToStudyList);
router.delete("/:id/notes/:noteId", validation, removeNoteFromStudyList);
router.post("/:id/todos/:todoId", validation, addTodoToStudyList);
router.delete("/:id/todos/:todoId", validation, removeTodoFromStudyList);

export default router;
