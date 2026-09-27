import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import {
  ROOT,
  DIST_DIR,
  listSourceSlugs,
  loadSourceConfig,
  readJsonIfExists,
  writeJsonSync
} from "../packages/core/lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_SRC = path.join(ROOT, "site");

function run(cmd, args, env) {
  const result = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, ...env } });
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited with ${result.status}`);
  }
}

function main() {
  const slugs = listSourceSlugs();
  if (slugs.length === 0) {
    console.error("No sources found under sources/. Nothing to build.");
    process.exit(1);
  }

  console.log(`Building ${slugs.length} source(s): ${slugs.join(", ")}`);

  fs.rmSync(DIST_DIR, { recursive: true, force: true });
  fs.mkdirSync(path.join(DIST_DIR, "data"), { recursive: true });

  // shared shell assets
  for (const file of ["index.html", "app.js", "styles.css"]) {
    const src = path.join(SITE_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST_DIR, file));
    }
  }

  const registry = [];
  for (const slug of slugs) {
    // build this source's data in its own process (ACTIVE_SOURCE is import-time)
    run("node", [path.join(__dirname, "build-one.mjs")], { YOUMIND_SOURCE: slug });

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

    // per-slug page so /<slug>/ resolves on static hosting
    const slugDir = path.join(DIST_DIR, slug);
    fs.mkdirSync(slugDir, { recursive: true });
    const shell = path.join(SITE_SRC, "index.html");
    if (fs.existsSync(shell)) {
      fs.copyFileSync(shell, path.join(slugDir, "index.html"));
    }
  }

  registry.sort((left, right) => left.order - right.order);

  const rootRegistry = readJsonIfExists(path.join(ROOT, "registry.json"));
  const siteMeta = rootRegistry?.site || {};

  writeJsonSync(path.join(DIST_DIR, "registry.json"), {
    generatedAt: new Date().toISOString(),
    site: siteMeta,
    sources: registry
  });

  console.log(`Aggregated site written to ${DIST_DIR}`);
}

main();
