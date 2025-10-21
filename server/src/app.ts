import express from "express";
import cors from "cors";
import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chatRouter } from "./routes/chat.js";
import { logger } from "./logger.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: "*",
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/chat", chatRouter);

  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.resolve(currentDir, "../../web/dist");
  if (existsSync(distPath)) {
    logger.info({ distPath }, "Sirviendo archivos estáticos desde frontend compilado");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, "Unhandled error");
    res.status(500).json({ error: "Error inesperado en el servidor" });
  });

  return app;
}
