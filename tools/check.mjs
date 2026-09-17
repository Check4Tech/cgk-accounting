/**
 * Pre-deploy sanity check: internal links, asset references, JSON-LD parsing,
 * duplicate ids and required per-page SEO tags.
 *
 *   node tools/check.mjs
 */
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const problems = [];
const note = (file, msg) => problems.push(`${file}: ${msg}`);

const files = (await readdir(root)).filter((f) => f.endsWith(".html"));

for (const file of files) {
  const html = await readFile(path.join(root, file), "utf8");

  // --- required head tags -------------------------------------------------
  if (!/<title>[^<]{10,65}<\/title>/.test(html)) note(file, "missing or badly sized <title>");
  const desc = html.match(/<meta name="description" content="([^"]+)"/);
  if (!desc) note(file, "missing meta description");
  else if (desc[1].length < 70 || desc[1].length > 320)
    note(file, `meta description is ${desc[1].length} chars`);
  // 404 is served on arbitrary URLs, so a canonical would be misleading.
  if (file !== "404.html" && !/<link rel="canonical"/.test(html))
    note(file, "missing canonical");
  if (!/<html lang="en"/.test(html)) note(file, "missing lang attribute");

  const h1s = html.match(/<h1[\s>]/g) || [];
  if (h1s.length !== 1) note(file, `${h1s.length} <h1> elements (expected 1)`);

  // --- JSON-LD parses -----------------------------------------------------
  for (const block of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    try {
      JSON.parse(block[1]);
    } catch (e) {
      note(file, `invalid JSON-LD: ${e.message}`);
    }
  }

  // --- duplicate ids ------------------------------------------------------
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (dupes.length) note(file, `duplicate id(s): ${[...new Set(dupes)].join(", ")}`);

  // --- links and assets resolve ------------------------------------------
  const refs = [
    ...[...html.matchAll(/\shref="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/\ssrc="([^"]+)"/g)].map((m) => m[1]),
  ];

  for (const ref of refs) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
    if (!ref.startsWith("/")) {
      note(file, `relative link (prefer root-relative): ${ref}`);
      continue;
    }
    const target = ref === "/" ? "/index.html" : ref.split("#")[0];
    try {
      await access(path.join(root, target));
    } catch {
      note(file, `broken link: ${ref}`);
    }
  }

  // --- in-page anchors exist ---------------------------------------------
  for (const m of html.matchAll(/\shref="#([^"]+)"/g)) {
    if (!ids.includes(m[1])) note(file, `anchor #${m[1]} has no matching id`);
  }

  // --- images have alt ----------------------------------------------------
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt=/.test(m[0])) note(file, `<img> without alt: ${m[0].slice(0, 80)}`);
  }
}

// --- every page is in the sitemap (except intentionally excluded) ----------
const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
const excluded = new Set(["404.html", "thanks.html"]);
for (const file of files) {
  if (excluded.has(file)) continue;
  const slug = file === "index.html" ? "/" : `/${file}`;
  if (!sitemap.includes(`https://www.cgkaccountingservices.com${slug}<`))
    note("sitemap.xml", `missing ${slug}`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`OK — ${files.length} pages checked, no problems found.`);
