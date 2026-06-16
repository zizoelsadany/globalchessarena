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
import reportRoutes from "./routes/reportRoutes.js";
import tournamentRoutes from "./routes/tournamentRoutes.js";
import { errorHandler, notFound } from "./middleware/errorHandler.js";
import { configureSockets } from "./sockets/gameSocket.js";

const app = express();
const server = http.createServer(app);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDistPath = path.resolve(__dirname, "../client/dist");

app.use(helmet());
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false
  })
);

app.get("/health", (req, res) => res.json({ status: "ok", name: "Global Chess Arena" }));
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/tournaments", tournamentRoutes);
app.use("/api", notFound);

if (env.nodeEnv === "production") {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res) => res.sendFile(path.join(clientDistPath, "index.html")));
}

app.use(notFound);
app.use(errorHandler);

configureSockets(server);

assertDatabaseConnection()
  .then(() => {
    server.listen(env.port, () => {
      console.log(`Global Chess Arena API listening on http://localhost:${env.port}`);
    });
  })
  .catch((error) => {
    console.error("Unable to connect to MySQL", error);
    process.exit(1);
  });
