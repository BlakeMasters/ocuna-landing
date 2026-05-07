import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cp, readFile } from "node:fs/promises";
import path from "node:path";

function imagesDirectory() {
  let imagesDir;
  let distImagesDir;

  return {
    name: "ocuna-images-directory",
    configResolved(config) {
      imagesDir = path.resolve(config.root, "images");
      distImagesDir = path.resolve(config.root, config.build.outDir, "images");
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/images/")) {
          next();
          return;
        }

        try {
          const url = new URL(req.url, "http://localhost");
          const relativePath = decodeURIComponent(url.pathname.slice("/images/".length));
          const filePath = path.resolve(imagesDir, relativePath);
          const imagesRoot = `${imagesDir}${path.sep}`;

          if (!filePath.startsWith(imagesRoot)) {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
          }

          const contentTypes = {
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".webp": "image/webp",
            ".svg": "image/svg+xml",
            ".ico": "image/x-icon",
          };

          res.setHeader(
            "Content-Type",
            contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
          );
          res.end(await readFile(filePath));
        } catch {
          next();
        }
      });
    },
    async closeBundle() {
      await cp(imagesDir, distImagesDir, { recursive: true });
    },
  };
}

export default defineConfig({
  base: "/",
  publicDir: "site-public",
  plugins: [react(), imagesDirectory()],
});
