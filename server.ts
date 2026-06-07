import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Yahoo Finance CORS Proxy Endpoint
  app.get("/api/yahoo", async (req, res) => {
    try {
      const url = req.query.url;
      if (!url || typeof url !== "string") {
        return res.status(400).json({ error: "Missing url parameter" });
      }

      // Security validation: strictly allow query1.finance.yahoo.com to prevent SSRF
      if (!url.startsWith("https://query1.finance.yahoo.com/")) {
        return res.status(400).json({ error: "Unauthorized target URL" });
      }

      // Perform server-side fetch with organic browser headers to bypass blocks
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://finance.yahoo.com/",
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({ error: `Yahoo API returned error status ${response.status}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Error in yahoo proxy:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stock data from Yahoo Finance" });
    }
  });

  // 2. Health Check Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 3. Vite development / static production handler setup
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
