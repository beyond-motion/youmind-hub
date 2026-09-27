import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { ROOT, DIST_DIR, listSourceSlugs } from "../packages/core/lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  // Local build reads from committed/fetched snapshots (no Feishu creds locally).
  for (const slug of slugs) {
    run("node", [path.join(__dirname, "build-one.mjs")], {
      YOUMIND_SOURCE: slug,
      SITE_SOURCE_MODE: "public-only"
    });
  }

  // Assemble landing + per-slug pages + registry (+ quality gate).
  run("node", [path.join(__dirname, "assemble-site.mjs")], {});
}

main();
