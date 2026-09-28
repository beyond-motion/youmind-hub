// Fetch a curated collection from a GitHub repo and normalize into the raw
// youmind-prompt shape, so the existing build pipeline (site-source ->
// promptToSitePrompt -> dist/data/<slug>.json) works unchanged.
//
// Two modes (selected by config):
//   Mode 1 (inline):  api.url points to a JSON array whose entries already carry
//                     the prompt text (e.g. .../videos.json).
//   Mode 2 (catalog): api.url points to a catalog/index JSON, and api.itemFile is
//                     a per-item file template with a {slug} placeholder whose
//                     body is the full prompt (e.g. .../styles/{slug}/STYLE.md).

async function fetchText(url, timeoutMs = 45000) {
  const response = await fetch(url, {
    headers: { "user-agent": "youmind-hub/1.0", accept: "*/*" },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url));
}

function mapInlineEntry(entry) {
  const promptText = String(entry.prompt ?? entry.content ?? entry.prompt_text ?? "").trim();
  if (!promptText) return null;
  const author = String(entry.author ?? "").trim();
  const category = String(entry.category ?? "").trim();
  const label = [category, author ? `@${author}` : ""].filter(Boolean).join(" · ") || "Opus 5.5 video";
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
    detailUrl,
    techTags: Array.isArray(entry.tech_tags) ? entry.tech_tags : [],
    category
  };
}

function mapCatalogEntry(entry, itemText, source) {
  const slug = String(entry.slug ?? entry.id ?? "").trim();
  if (!slug) return null;
  const repoBase = (source?.api?.repoBase || "").replace(/\/+$/, "");
  const promptText = (itemText || "").trim() || String(entry.line || entry.line_cn || "").trim();
  if (!promptText) return null;
  const en = String(entry.en ?? "").trim();
  const cn = String(entry.cn ?? "").trim();
  const title = [cn, en].filter(Boolean).join(" · ") || en || slug;
  return {
    id: slug,
    title,
    description: String(entry.line || entry.line_cn || "").trim(),
    content: promptText,
    translatedContent: "",
    language: source?.api?.locale || "zh-CN",
    featured: false,
    sourceLink: entry.source_url || (repoBase ? `${repoBase}/blob/main/styles/${slug}/STYLE.md` : ""),
    sourcePublishedAt: "",
    author: { name: source?.api?.author || "LemoLab", link: repoBase },
    videos: [],
    referenceImages: [],
    detailUrl: entry.detail_url || (repoBase ? `${repoBase}/tree/main/styles/${slug}` : ""),
    techTags: Array.isArray(entry.uses) ? entry.uses : [],
    category: String(entry.cat || entry.cat_en || "").trim()
  };
}

async function mapInParallel(items, mapper, concurrency = 6) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}

export async function fetchGithubJsonSnapshot(source, { locale, onProgress } = {}) {
  const api = source?.api || {};
  if (!api.url) {
    throw new Error(`github-json source "${source?.slug}" is missing api.url`);
  }

  const catalog = await fetchJson(api.url);
  const entries = Array.isArray(catalog) ? catalog : Object.values(catalog || {});

  let prompts;
  if (api.itemFile) {
    let done = 0;
    prompts = (
      await mapInParallel(entries, async (entry) => {
        const slug = String(entry.slug ?? entry.id ?? "").trim();
        let itemText = "";
        if (slug) {
          const fileUrl = api.itemFile.replace("{slug}", encodeURIComponent(slug));
          try {
            itemText = await fetchText(fileUrl);
          } catch (error) {
            console.warn(`  item fetch failed for ${slug}: ${error.message}`);
          }
        }
        done += 1;
        if (typeof onProgress === "function") {
          onProgress({ fetched: done, total: entries.length });
        }
        return mapCatalogEntry(entry, itemText, source);
      })
    ).filter(Boolean);
  } else {
    prompts = entries.map(mapInlineEntry).filter(Boolean);
    if (typeof onProgress === "function") {
      onProgress({ fetched: prompts.length, total: entries.length });
    }
  }

  return {
    fetchedAt: new Date().toISOString(),
    locale: locale || api.locale || "en",
    model: api.model || source?.slug,
    total: prompts.length,
    totalPages: 1,
    prompts
  };
}
