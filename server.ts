import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { 
  app, 
  syncKnownArticles, 
  enrichThinArticles, 
  runBackgroundSweep,
  continuousWorker
} from "./server/app.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = 3000;

  // Initialize known article registry and content enricher
  await syncKnownArticles();
  setTimeout(enrichThinArticles, 3000);

  // Initialize and start autonomous Continuous Monitoring Worker
  await continuousWorker.init();

  // Vite middleware in dev, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BlogSpy AI server running on port ${PORT}`);
  });
}

startServer();
