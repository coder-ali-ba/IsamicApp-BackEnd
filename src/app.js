import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import auth_router from "./routes/auth.routes.js";
import course_router from "./routes/course.route.js";
import enrollment_router from "./routes/enrollment.routes.js";
import lesson_router from "./routes/lesson.routes.js"
import teacher_router from "./routes/teacher.routes.js";
import class_routes from "./routes/class.routes.js"
import fatwaRouter from "./routes/fatwa.routes.js";
import message_router from "./routes/message.routes.js"
import settings_router from "./routes/settings.routes.js";
import teacher_students_router from "./routes/teacher.students.routes.js"
import studentQuestionRouter from "./routes/studentQuestion.routes.js";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow Postman and server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "IlmHub API is running",
  });
});

app.use("/api/auth", auth_router);
app.use("/api/courses" , course_router);
app.use("/api/enrollments" , enrollment_router)
app.use("/api/lessons" , lesson_router)
app.use("/api/teacher" , teacher_router)
app.use("/api/classes" , class_routes)
app.use("/api/fatwas" , fatwaRouter);
app.use("/api/messages" , message_router);
app.use("/api/settings" , settings_router)
app.use("/api/teacher/students" , teacher_students_router);
app.use("/api/questions" , studentQuestionRouter)

export default app;