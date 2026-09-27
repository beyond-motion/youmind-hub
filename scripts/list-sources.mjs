import { listSourceSlugs, loadSourceConfig } from "../packages/core/lib/config.mjs";

// Prints a JSON array of enabled source slugs for the CI matrix.
const slugs = listSourceSlugs().filter((slug) => loadSourceConfig(slug).enabled !== false);
process.stdout.write(JSON.stringify(slugs));
