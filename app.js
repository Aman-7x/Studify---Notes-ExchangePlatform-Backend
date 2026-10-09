import express from "express";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

 
import { errorHandler } from "./middlewares/errorHandler.js";

import userRoutes from "./routes/userRoute.js";
import noteRoutes from "./routes/notesRoute.js";
import todoRoutes from "./routes/toDoRoute.js";
import studyListRoutes from "./routes/studyListRoute.js";
import universityRoutes from "./routes/universityRoute.js";
import courseRoutes from "./routes/courseRoute.js";
import feedbackRoutes from "./routes/feedbackRoute.js";
import genai from "./routes/genai.js";

const app = express(); 

dotenv.config();
import { dbConnect } from "./configs/dbConnection.js";
cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});
dbConnect();
 
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cookieParser());
app.use(cors());

app.use(express.static("public"));

app.use("/api/users", userRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/study-lists", studyListRoutes);
app.use("/api/universities", universityRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/genai", genai);

app.get("/api/", (req, res) => {
  res.send("Welcome to the Studify API!");
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`Access API at http://localhost:${port}/api/`);
});
