import express from "express";
import path from "path";
import dotenv from "dotenv";
import apiApp from "./api/index.js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Mount the integrated API router containing all user auth and word analysis routes
app.use(apiApp);

// Configure Vite middleware in development, and serve static build in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
