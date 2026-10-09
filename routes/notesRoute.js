// ./routes/noteRoutes.js
import express from "express";
import {
  uploadNote,
  getAllNotes,
  getNoteById,
  updateNote,
  deleteNote,
  likeNote,
  dislikeNote,
  downloadNote,
  getNotesByCourse,
  getNotesByUniversity,
  getNotesByUploader,
  getLoggedInUserUploadedNotes,
} from "../controllers/notesController.js";
import { validation } from "../middlewares/validity.js";
import multer from "multer";
 
const upload = multer({ dest: "/uploads/notes" });

const router = express.Router(); 

router.get("/my-uploads", validation, getLoggedInUserUploadedNotes);

router.post("/upload", validation, upload.single("noteFile"), uploadNote);

router.get("/", getAllNotes);
router.get("/:id", getNoteById);

router.get("/course/:courseId", getNotesByCourse);
router.get("/university/:universityId", getNotesByUniversity);
router.get("/user/:userId", getNotesByUploader);

router.post("/:id/like", validation, likeNote);
router.post("/:id/dislike", validation, dislikeNote);
router.get("/:id/download", validation, downloadNote);

router.put("/:id", validation, updateNote);
router.delete("/:id", validation, deleteNote);
export default router;
