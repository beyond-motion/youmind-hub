// Fetch a curated prompts collection from a GitHub repo's JSON (e.g. videos.json)
// and normalize each entry into the raw youmind-prompt shape, so the existing
// build pipeline (site-source -> promptToSitePrompt -> dist/data/<slug>.json)
// works unchanged. Used by sources with kind: "github-json".

function mapEntryToPrompt(entry) {
  const promptText = String(entry.prompt ?? entry.content ?? entry.prompt_text ?? "").trim();
  if (!promptText) {
    return null;
  }

  const author = String(entry.author ?? "").trim();
  const category = String(entry.category ?? "").trim();
  const label =
    [category, author ? `@${author}` : ""].filter(Boolean).join(" · ") || "Opus 5.5 video";

  const detailUrl = entry.skillry_url || entry.detail_url || entry.post_url || "";
  const sourceLink = entry.post_url || entry.skillry_url || detailUrl;
  const thumbnail = entry.poster_url || entry.thumbnail_url || entry.thumbnail || "";

  return {
    id: String(entry.slug ?? entry.id ?? ""),
    title: label,
    description: promptText,
    content: promptText,
    translatedContent: "",
    language: "en",
    featured: false,
    sourceLink,
    sourcePublishedAt: entry.added || entry.published_at || entry.publishedAt || "",
    author: { name: author, link: entry.author_url || "" },
    videos: detailUrl ? [{ sourceUrl: detailUrl, thumbnail, caption: "" }] : [],
    referenceImages: [],
    // per-entry detail/source links (used verbatim by promptToSitePrompt when set)
    detailUrl,
    techTags: Array.isArray(entry.tech_tags) ? entry.tech_tags : [],
    category
  };
}

export async function fetchGithubJsonSnapshot(source, { locale, onProgress } = {}) {
  const url = source?.api?.url;
  if (!url) {
    throw new Error(`github-json source "${source?.slug}" is missing api.url`);
  }

  const response = await fetch(url, {
    headers: { "user-agent": "youmind-hub/1.0", accept: "application/json" },
    signal: AbortSignal.timeout(45000)
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const raw = await response.json();
  const entries = Array.isArray(raw) ? raw : Object.values(raw || {});
  const prompts = entries.map(mapEntryToPrompt).filter(Boolean);

  if (typeof onProgress === "function") {
    onProgress({ fetched: prompts.length, total: entries.length });
  }

  return {
    fetchedAt: new Date().toISOString(),
    locale: locale || source?.api?.locale || "en",
    model: source?.api?.model || source?.slug,
    total: prompts.length,
    totalPages: 1,
    prompts
  };
}
