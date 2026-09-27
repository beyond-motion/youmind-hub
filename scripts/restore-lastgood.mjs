import fs from "fs";
import path from "path";
import { ROOT, DIST_DIR, listSourceSlugs, readJsonIfExists } from "../packages/core/lib/config.mjs";

// In CI, a transient fetch/build failure means a source's artifact is missing
// from the matrix run. Restore it from the last-good copy on the data worker
// (backed by R2, uploaded by the previous successful run) so the library does
// not drop off the site until the next successful run.
const rootRegistry = readJsonIfExists(path.join(ROOT, "registry.json")) || {};
const dataOrigin = (rootRegistry.site?.dataOrigin || "").replace(/\/+$/, "");

if (!dataOrigin) {
  console.log("No dataOrigin configured; skipping last-good restore.");
  process.exit(0);
}

let restored = 0;
for (const slug of listSourceSlugs()) {
  const out = path.join(DIST_DIR, "data", `${slug}.json`);
  if (fs.existsSync(out)) {
    continue;
  }
  try {
    const response = await fetch(`${dataOrigin}/data/${slug}.json`);
    if (response.ok) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(await response.arrayBuffer()));
      console.log(`Restored last-good: ${slug}`);
      restored += 1;
    } else {
      console.log(`No last-good for ${slug} (HTTP ${response.status}); it will be hidden.`);
    }
  } catch (error) {
    console.log(`Restore failed for ${slug}: ${error.message}`);
  }
}

console.log(`Restored ${restored} source(s) from last-good.`);
