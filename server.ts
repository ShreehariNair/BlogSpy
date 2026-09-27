import dns from "node:dns";

// Force custom DNS resolvers and IPv4 priority before any network/MongoDB connections
try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (dnsErr: any) {
  console.warn("[DNS Setup] Notice setting custom DNS servers:", dnsErr.message);
}

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { app, syncKnownArticles } from "./server/app.js";
import { connectMongo, initializeDatabase } from "./server/mongo.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const PORT = 3000;

  // 1. Mount Vite middleware in development or static assets in production first
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

  // 2. Start Express server immediately for instant localhost response (< 200ms)
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BlogSpy AI server running on http://localhost:${PORT}`);
  });

  // 3. Initialize database asynchronously without auto-starting background competitor checkers
  setImmediate(async () => {
    try {
      await connectMongo();
      await initializeDatabase();
      await syncKnownArticles();
    } catch (err: any) {
      console.warn("[Server Async Init] Database setup notice:", err.message);
    }
  });
}

startServer();
