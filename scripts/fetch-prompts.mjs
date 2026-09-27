import path from "path";
import { ACTIVE_SOURCE, DATA_DIR, resolveSyncTarget, writeJsonSync } from "../packages/core/lib/config.mjs";
import { loadOrFetchPromptPayload } from "../packages/core/lib/prompt-source.mjs";

function readNumberEnv(name) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : undefined;
}

async function main() {
  if (ACTIVE_SOURCE && ACTIVE_SOURCE.kind === "static") {
    console.log(`Source=${ACTIVE_SOURCE.slug} is static (no API); skipping fetch.`);
    return;
  }

  const { slug, locale, model, endpoint, gallerySlug } = resolveSyncTarget({ requireBase: false });
  const maxCacheAgeHours = readNumberEnv("YOUMIND_MAX_CACHE_AGE_HOURS");
  const preferCache = maxCacheAgeHours !== undefined;
  const allowStaleFallbackOnError = process.env.YOUMIND_ALLOW_STALE_CACHE_ON_ERROR === "1";

  console.log(`Fetching prompts for source=${slug} model=${model} endpoint=${endpoint} locale=${locale} ...`);
  if (preferCache) {
    console.log(`Cache preference enabled. maxAge=${maxCacheAgeHours}h`);
  }

  const { payload, source, fetchError } = await loadOrFetchPromptPayload({
    locale,
    model,
    endpoint,
    gallerySlug,
    forceRefresh: process.env.YOUMIND_FORCE_REFRESH === "1",
    preferCache,
    maxCacheAgeHours,
    allowStaleFallbackOnError,
    onProgress({ page, totalPages, fetched, total }) {
      console.log(`  page ${page}/${totalPages} fetched=${fetched}/${total}`);
    }
  });

  if (source === "cache") {
    console.log(`Using cached prompts snapshot (${payload.prompts.length} rows)`);
  } else if (source === "stale-cache") {
    console.warn(
      `Remote fetch failed, falling back to cached prompts snapshot (${payload.prompts.length} rows): ${fetchError.message}`
    );
  } else {
    console.log(`Fetched fresh prompts snapshot (${payload.prompts.length} rows)`);
  }

  const outputPath = path.join(DATA_DIR, `prompts.${locale}.json`);
  writeJsonSync(outputPath, payload);

  console.log(`Saved ${payload.prompts.length} prompts to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
