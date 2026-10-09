import express from "express";
import { validation } from "../middlewares/validity.js";
import {
  getAllCourses,
  getCourseById,
  getCoursesByUniversity,
  followCourse,
  unfollowCourse,
  getLoggedInUserFollowedCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from "../controllers/courseController.js";
import { adminValidation } from "../middlewares/adminValidy.js";

const router = express.Router();

router.post("/", validation, createCourse);
router.put("/:id", validation, updateCourse);
router.get("/my-followed", validation, getLoggedInUserFollowedCourses);
router.get("/", getAllCourses);
router.get("/:id", getCourseById);
router.get("/university/:universityId", getCoursesByUniversity);

router.post("/:id/follow", validation, followCourse);
router.delete("/:id/unfollow", validation, unfollowCourse);

// --- ADMIN-PROTECTED ROUTES FOR COURSE MANAGEMENT ---
router.delete("/:id", validation, adminValidation, deleteCourse);

export default router;
