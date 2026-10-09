import express from "express";
import { validation } from "../middlewares/validity.js";
import {
  createTodo,
  getTodoById,
  getUserTodos,
  updateTodo,
  deleteTodo,
} from "../controllers/toDoController.js";

const router = express.Router();

router.post("/", validation, createTodo);
router.get("/me", validation, getUserTodos);
router.get("/:id", validation, getTodoById);
router.put("/:id", validation, updateTodo);
router.delete("/:id", validation, deleteTodo);
export default router;
 