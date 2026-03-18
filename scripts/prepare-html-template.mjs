import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const distIndex = resolve(root, "dist", "index.html");
const templateDir = resolve(root, "templates");
const templateIndex = resolve(templateDir, "index.html");

await mkdir(templateDir, { recursive: true });
await copyFile(distIndex, templateIndex);

console.log(`Prepared HTML template at ${templateIndex}`);
