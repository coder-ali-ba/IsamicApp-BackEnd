import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import auth_router from "./routes/auth.routes.js";
import course_router from "./routes/course.route.js";
import enrollment_router from "./routes/enrollment.routes.js";

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

export default app;