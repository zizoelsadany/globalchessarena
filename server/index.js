import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { assertDatabaseConnection } from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import matchRoutes from "./routes/matchRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import premiumRoutes from "./routes/premiumRoutes.js";
import gamificationRoutes from "./routes/gamificationRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { tournamentUpload } from "./middleware/upload.js";
import { configureSockets } from "./sockets/gameSocket.js";
import { initAnalytics, incrementVisits } from "./models/Analytics.js";
import { startEmailQueueWorker } from "./services/emailQueueService.js";
import { startArchiveWorker } from "./services/archiveService.js";

const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../client/dist");

app.use(helmet());
const allowedOrigins = new Set([env.clientUrl]);
if (env.nodeEnv === "development") {
  allowedOrigins.add("http://localhost:5173");
  allowedOrigins.add("http://127.0.0.1:5173");
  allowedOrigins.add("http://[::1]:5173");
}
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin) || origin.endsWith(".trycloudflare.com")) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
const uploadsPath = path.resolve(__dirname, "./uploads");
app.use("/uploads", (req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}, express.static(uploadsPath));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.post("/api/track-visit", (req, res) => {
  incrementVisits();
  res.json({ success: true });
});

app.get("/health", (req, res) => res.json({ status: "ok", name: "Global Chess Arena" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api/premium", premiumRoutes);
app.use("/api/gamification", gamificationRoutes);
app.use("/api", notFound);

if (env.nodeEnv === "production") {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
}

app.use(notFound);
app.use(errorHandler);

configureSockets(server);

assertDatabaseConnection()
  .then(() => initAnalytics())
  .then(() => {
    // Start background workers
    startEmailQueueWorker();
    startArchiveWorker();

    server.listen(env.port, () => {
      console.log(`Global Chess Arena API listening on http://localhost:${env.port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to MySQL", error);
    process.exit(1);
  });

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

