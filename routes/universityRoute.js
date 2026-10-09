import express from "express";
import {
  getAllUniversities,
  getUniversityById,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} from "../controllers/universityController.js";
import { adminValidation } from "../middlewares/adminValidy.js";
import { validation } from "../middlewares/validity.js";

const router = express.Router();

router.get("/", getAllUniversities);
router.get("/:id", getUniversityById);

//Admin routes
router.post("/", validation, adminValidation, createUniversity);
router.put("/:id", validation, adminValidation, updateUniversity);
router.delete("/:id", validation, adminValidation, deleteUniversity);
export default router;
