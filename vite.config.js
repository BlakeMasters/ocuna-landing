import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const productionImages = [
  "OnVeil.webp",
  "ocuna_background1c.webp",
  "ocuna_background4c_cloud_masked.webp",
  "ocuna_logo.png",
  "ocuna_logo.webp",
  "ocuna_title_logo_nobackground.webp",
];

function imagesDirectory() {
  let imagesDir;
  let distImagesDir;
  let rootDir;

  return {
    name: "ocuna-images-directory",
    configResolved(config) {
      rootDir = config.root;
      imagesDir = path.resolve(config.root, "images");
      distImagesDir = path.resolve(config.root, config.build.outDir, "images");
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url ? new URL(req.url, "http://localhost").pathname : "";
        const documentationSources = new Map([
          ["/docs/ocura-oss.md", "src/content/docs/ocura-oss.md"],
          ["/docs/cli.md", "src/content/docs/cli.md"],
          ["/docs/api.md", "src/content/docs/api.md"],
        ]);
        const documentationSource = documentationSources.get(pathname);
        if (documentationSource) {
          try {
            res.setHeader("Content-Type", "text/markdown; charset=utf-8");
            res.end(await readFile(path.resolve(rootDir, documentationSource)));
            return;
          } catch {
            next();
            return;
          }
        }

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
      await mkdir(distImagesDir, { recursive: true });
      await Promise.all(
        productionImages.map((fileName) =>
          copyFile(path.join(imagesDir, fileName), path.join(distImagesDir, fileName)),
        ),
      );
    },
  };
}

export default defineConfig({
  base: "/",
  publicDir: "site-public",
  plugins: [react(), imagesDirectory()],
});
