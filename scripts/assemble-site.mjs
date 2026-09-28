import fs from "fs";
import path from "path";
import {
  ROOT,
  DIST_DIR,
  listSourceSlugs,
  loadSourceConfig,
  readJsonIfExists,
  writeJsonSync
} from "../packages/core/lib/config.mjs";

// Assemble the unified static site from already-built per-source data files
// (dist/data/<slug>.json). Emits: shared shell assets, a landing page (dist/),
// and one templated gallery page per source (dist/<slug>/index.html) carrying
// that source's branding + slug + dataOrigin. Large data is served from R2 via
// the data-gate Worker (site.data.dataOrigin); only the shell stays on Pages.
const SITE_SRC = path.join(ROOT, "site");

function main() {
  const slugs = listSourceSlugs();
  fs.mkdirSync(path.join(DIST_DIR, "data"), { recursive: true });

  for (const file of ["styles.css", "app.js", "landing.js", "_headers"]) {
    const src = path.join(SITE_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST_DIR, file));
    }
  }

  const rootRegistry = readJsonIfExists(path.join(ROOT, "registry.json")) || {};
  const siteMeta = rootRegistry.site || {};
  const dataOrigin = siteMeta.dataOrigin || "";
  const canonical = (siteMeta.canonical || "https://youmind.beyondmotion.net").replace(/\/+$/, "");
  const buildId = process.env.BUILD_ID || process.env.GITHUB_SHA || String(Date.now());
  const galleryTemplate = fs.readFileSync(path.join(SITE_SRC, "gallery.html"), "utf8");

  const landingSrc = path.join(SITE_SRC, "index.html");
  if (fs.existsSync(landingSrc)) {
    const landingHtml = fs.readFileSync(landingSrc, "utf8")
      .replaceAll("__CANONICAL__", canonical)
      .replaceAll("__BUILD_ID__", buildId);
    fs.writeFileSync(path.join(DIST_DIR, "index.html"), landingHtml);
  }

  const registry = [];
  for (const slug of slugs) {
    const config = loadSourceConfig(slug);
    const payload = readJsonIfExists(path.join(DIST_DIR, "data", `${slug}.json`));
    const branding = config.branding || {};
    const title = config.title || slug;
    const repoName = (branding.sourceRepo || "").split("/").pop() || slug;

    registry.push({
      slug,
      title,
      category: config.category || config.kind || "image",
      kind: config.kind || "image",
      order: config.order ?? 999,
      enabled: config.enabled !== false,
      count: payload?.total ?? 0,
      lastSync: payload?.generatedAt ?? "",
      dataSource: payload?.dataSourceLabel ?? "",
      branding
    });

    const slugDir = path.join(DIST_DIR, slug);
    fs.mkdirSync(slugDir, { recursive: true });
    const html = galleryTemplate
      .replaceAll("__SLUG__", slug)
      .replaceAll("__DATA_ORIGIN__", dataOrigin)
      .replaceAll("__LIST_MODE__", config.listMode === false ? "false" : "true")
      .replaceAll("__CANONICAL__", canonical)
      .replaceAll("__BUILD_ID__", buildId)
      .replaceAll("__TITLE__", title)
      .replaceAll("__EYEBROW__", branding.eyebrow || `${title} Prompt Index`)
      .replaceAll("__HEADLINE__", branding.headline || `独立整理的 ${title} 提示词检索库`)
      .replaceAll("__SOURCE_REPO_NAME__", repoName);
    fs.writeFileSync(path.join(slugDir, "index.html"), html);
  }

  registry.sort((left, right) => left.order - right.order);

  // Hide any source that produced no data; hard-fail only if NOTHING is shippable.
  const shippable = registry.filter((source) => source.count > 0);
  const empty = registry.filter((source) => source.count === 0).map((source) => source.slug);
  for (const source of registry) {
    if (source.count === 0) {
      source.enabled = false;
    }
  }
  if (empty.length > 0) {
    console.warn(`WARNING: hiding sources with 0 prompts: ${empty.join(", ")}`);
  }
  if (shippable.length === 0 && process.env.YOUMIND_SKIP_COUNT_GATE !== "1") {
    console.error("QUALITY GATE FAILED: no source produced data — refusing to deploy an empty site.");
    process.exit(1);
  }

  writeJsonSync(path.join(DIST_DIR, "registry.json"), {
    generatedAt: new Date().toISOString(),
    site: siteMeta,
    sources: registry
  });

  console.log(`Assembled ${registry.length} source(s) -> ${DIST_DIR}`);
}

main();
