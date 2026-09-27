import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ROOT,
  DIST_DIR,
  listSourceSlugs,
  loadSourceConfig,
  readJsonIfExists,
  writeJsonSync
} from "../packages/core/lib/config.mjs";

// Assemble the unified static site from already-built per-source data files
// (dist/data/<slug>.json). Used by CI after downloading matrix artifacts, and
// safe to run standalone when dist/data/* already exist.
const SITE_SRC = path.join(ROOT, "site");

function main() {
  const slugs = listSourceSlugs();
  fs.mkdirSync(path.join(DIST_DIR, "data"), { recursive: true });

  for (const file of ["index.html", "app.js", "styles.css"]) {
    const src = path.join(SITE_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST_DIR, file));
    }
  }

  const registry = [];
  for (const slug of slugs) {
    const config = loadSourceConfig(slug);
    const payload = readJsonIfExists(path.join(DIST_DIR, "data", `${slug}.json`));

    registry.push({
      slug,
      title: config.title || slug,
      kind: config.kind || "image",
      order: config.order ?? 999,
      enabled: config.enabled !== false,
      count: payload?.total ?? 0,
      lastSync: payload?.generatedAt ?? "",
      dataSource: payload?.dataSourceLabel ?? "",
      branding: config.branding || {}
    });

    const slugDir = path.join(DIST_DIR, slug);
    fs.mkdirSync(slugDir, { recursive: true });
    const shell = path.join(SITE_SRC, "index.html");
    if (fs.existsSync(shell)) {
      fs.copyFileSync(shell, path.join(slugDir, "index.html"));
    }
  }

  registry.sort((left, right) => left.order - right.order);

  const rootRegistry = readJsonIfExists(path.join(ROOT, "registry.json"));
  writeJsonSync(path.join(DIST_DIR, "registry.json"), {
    generatedAt: new Date().toISOString(),
    site: rootRegistry?.site || {},
    sources: registry
  });

  console.log(`Assembled ${registry.length} source(s) -> ${DIST_DIR}`);
}

main();
