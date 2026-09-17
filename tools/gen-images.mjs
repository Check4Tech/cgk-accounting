/**
 * Regenerates the raster icons and the social-share image from the SVG sources.
 *
 *   npm install --no-save sharp
 *   node tools/gen-images.mjs
 *
 * Only needs to be re-run if assets/img/favicon.svg or og-image.svg change.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const img = (f) => path.join(root, "assets", "img", f);

const jobs = [
  { src: "favicon.svg", out: "apple-touch-icon.png", size: 180, bg: "#8fc400" },
  { src: "favicon.svg", out: "icon-512.png", size: 512, bg: "#8fc400" },
  { src: "favicon.svg", out: "icon-192.png", size: 192, bg: "#8fc400" },
];

for (const { src, out, size, bg } of jobs) {
  const svg = await readFile(img(src));
  const png = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: bg })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(img(out), png);
  console.log(`${out}  ${size}x${size}  ${png.length} bytes`);
}

const ogSvg = await readFile(img("og-image.svg"));
const og = await sharp(ogSvg, { density: 144 })
  .resize(1200, 630, { fit: "cover" })
  .png({ compressionLevel: 9 })
  .toBuffer();
await writeFile(img("og-image.png"), og);
console.log(`og-image.png  1200x630  ${og.length} bytes`);
