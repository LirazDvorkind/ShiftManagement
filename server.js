/**
 * HTTP server entry point.
 *
 * Starts the Express app and performs a graceful shutdown on SIGTERM/SIGINT,
 * ensuring the Prisma connection pool is drained before the process exits.
 */

const app = require("./src/app");
const prisma = require("./src/lib/prisma");

const PORT = parseInt(process.env.PORT || "3001", 10);

const server = app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
  console.log(`[server] Environment: ${process.env.NODE_ENV || "development"}`);
});

async function shutdown(signal) {
  console.log(`[server] ${signal} received. Shutting down gracefully…`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[server] Closed. Goodbye.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
