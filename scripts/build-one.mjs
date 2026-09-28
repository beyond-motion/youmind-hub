import path from "path";
import { ACTIVE_SOURCE, DIST_DIR, writeJsonSync } from "../packages/core/lib/config.mjs";
import { loadSitePayloadForBuild } from "../packages/core/lib/site-source.mjs";

// Light list payload: card + filter fields only (drops heavy prompt/translated
// text + video/reference arrays) so the gallery can first-paint fast and load
// the full text lazily. Same length as the full payload by construction.
function toListPrompt(p) {
  const a = p.analysis || {};
  return {
    id: p.id,
    title: p.title,
    description: (p.description || "").slice(0, 160),
    thumbnailUrl: p.thumbnailUrl || "",
    featured: p.featured,
    language: p.language || "",
    sourceLink: p.sourceLink || "",
    sourcePublishedAt: p.sourcePublishedAt || "",
    authorName: p.authorName || "",
    authorLink: p.authorLink || "",
    detailUrl: p.detailUrl || "",
    analysis: a
  };
}

async function main() {
  if (!ACTIVE_SOURCE) {
    throw new Error("build-one.mjs requires YOUMIND_SOURCE=<slug>.");
  }

  const slug = ACTIVE_SOURCE.slug;
  const { payload, source } = await loadSitePayloadForBuild();
  const outputPath = path.join(DIST_DIR, "data", `${slug}.json`);
  writeJsonSync(outputPath, payload);

  const listPayload = { ...payload, prompts: payload.prompts.map(toListPrompt) };
  const listPath = path.join(DIST_DIR, "data", `${slug}.list.json`);
  writeJsonSync(listPath, listPayload);
  if (listPayload.prompts.length !== payload.prompts.length) {
    throw new Error(`[${slug}] list length ${listPayload.prompts.length} != full ${payload.prompts.length}`);
  }

  console.log(
    `[${slug}] site data -> ${outputPath} (total=${payload.total}, source=${source}); list -> ${listPath}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
