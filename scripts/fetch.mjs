import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { listSourceSlugs } from "../packages/core/lib/config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function main() {
  const only = argValue("--source");
  const slugs = only ? [only] : listSourceSlugs();

  if (slugs.length === 0) {
    console.error("No sources to fetch. Add sources/<slug>/config.json first.");
    process.exit(1);
  }

  console.log(`Fetching ${slugs.length} source(s): ${slugs.join(", ")}`);

  let failed = 0;
  for (const slug of slugs) {
    const result = spawnSync("node", [path.join(__dirname, "fetch-prompts.mjs")], {
      stdio: "inherit",
      env: { ...process.env, YOUMIND_SOURCE: slug }
    });
    if (result.status !== 0) {
      failed += 1;
      console.error(`Fetch failed for source=${slug} (exit ${result.status})`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
