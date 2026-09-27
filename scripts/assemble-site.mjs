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
// by build-site.mjs locally. Large data files are expected to be served from R2
// via the data-gate Worker (site.data.dataOrigin); only the shell + registry +
// per-slug pages stay on Pages.
const SITE_SRC = path.join(ROOT, "site");

function main() {
  const slugs = listSourceSlugs();
  fs.mkdirSync(path.join(DIST_DIR, "data"), { recursive: true });

  // landing shell (relative asset paths => works at domain root AND under /<repo>/)
  for (const file of ["index.html", "app.js", "styles.css"]) {
    const src = path.join(SITE_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST_DIR, file));
    }
  }

  const shellSource = fs.existsSync(path.join(SITE_SRC, "index.html"))
    ? fs.readFileSync(path.join(SITE_SRC, "index.html"), "utf8")
    : "";
  // per-slug pages live one level deeper -> rewrite relative asset paths to ../
  const shellForSlug = shellSource
    .replace('href="./styles.css"', 'href="../styles.css"')
    .replace('src="./app.js"', 'src="../app.js"');

  const rootRegistry = readJsonIfExists(path.join(ROOT, "registry.json")) || {};
  const siteMeta = rootRegistry.site || {};

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
    if (shellForSlug) {
      fs.writeFileSync(path.join(slugDir, "index.html"), shellForSlug);
    }
  }

  registry.sort((left, right) => left.order - right.order);

  // Hide any source that produced no data (transient fetch/build failure) so the
  // nav never links to an empty page; hard-fail only if NOTHING is shippable
  // (e.g. the artifact-flatten step silently produced zero files -> the P0-2 bug).
  // NOTE: must run BEFORE writing registry.json so the hidden state persists.
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
