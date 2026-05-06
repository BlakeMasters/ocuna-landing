import { copyFile, mkdir } from "node:fs/promises";

await copyFile("dist/index.html", "dist/404.html");
await mkdir("dist/critter-acknowledgement", { recursive: true });
await copyFile("dist/index.html", "dist/critter-acknowledgement/index.html");
await copyFile("dist/index.html", "dist/critter-acknowledgement.html");
