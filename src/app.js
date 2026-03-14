/**
 * Express application factory.
 *
 * Configures global middleware (security headers, CORS, JSON body parsing)
 * and mounts all API routers. The global error handler normalises all
 * uncaught errors into a consistent JSON envelope.
 */

require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");

const authRouter = require("./routes/auth");
const roomsRouter = require("./routes/rooms");
const managerRouter = require("./routes/manager");

const app = express();

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

app.use(helmet());
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.use("/api/auth", authRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/manager", managerRouter);

// Health check
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// ---------------------------------------------------------------------------
// Global error handler
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV !== "production";

  console.error("[Error]", err);

  if (err.name === "PrismaClientKnownRequestError") {
    return res.status(400).json({ error: "Database request error.", code: err.code });
  }

  return res.status(500).json({
    error: "Internal server error.",
    ...(isDev && { message: err.message, stack: err.stack }),
  });
});

module.exports = app;
