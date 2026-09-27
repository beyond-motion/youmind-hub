import path from "path";
import { ACTIVE_SOURCE, DIST_DIR, writeJsonSync } from "../packages/core/lib/config.mjs";
import { loadSitePayloadForBuild } from "../packages/core/lib/site-source.mjs";

async function main() {
  if (!ACTIVE_SOURCE) {
    throw new Error("build-one.mjs requires YOUMIND_SOURCE=<slug>.");
  }

  const slug = ACTIVE_SOURCE.slug;
  const { payload, source } = await loadSitePayloadForBuild();
  const outputPath = path.join(DIST_DIR, "data", `${slug}.json`);
  writeJsonSync(outputPath, payload);

  console.log(`[${slug}] site data -> ${outputPath} (total=${payload.total}, source=${source})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
