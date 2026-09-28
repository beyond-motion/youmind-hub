import crypto from "crypto";

export function chunk(items, size) {
  const groups = [];

  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }

  return groups;
}

function joinUrlList(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  const normalized = values
    .map((value) => {
      if (typeof value === "string") {
        return value.trim();
      }

      if (value && typeof value === "object" && typeof value.url === "string") {
        return value.url.trim();
      }

      return "";
    })
    .filter(Boolean);

  return normalized.join("\n");
}

export function splitUrlList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") {
          return item.trim();
        }

        if (item && typeof item === "object" && typeof item.url === "string") {
          return item.url.trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPrimaryVideo(prompt) {
  if (Array.isArray(prompt.videos) && prompt.videos.length > 0) {
    return prompt.videos[0];
  }

  return null;
}

export function extractOriginalVideoUrl(prompt) {
  const primaryVideo = getPrimaryVideo(prompt);
  const caption = typeof primaryVideo?.caption === "string" ? primaryVideo.caption : "";
  const match = caption.match(/Imported from URL:\s*(https?:\/\/\S+)/i);

  return match ? match[1].trim() : "";
}

export function buildContentHash(row) {
  const stablePayload = {
    promptId: row["Prompt ID"],
    title: row["Title"],
    description: row["Description"],
    prompt: row["Prompt"],
    translatedPrompt: row["Translated Prompt"],
    language: row["Language"],
    featured: row["Featured"],
    sourceLink: row["Source Link"],
    sourcePublishedAt: row["Source Published At"],
    author: row["Author"],
    authorLink: row["Author Link"],
    videoUrl: row["Video URL"],
    thumbnailUrl: row["Thumbnail URL"],
    referenceImages: row["Reference Images"],
    detailUrl: row["Detail URL"],
    model: row["Model"]
  };

  return crypto.createHash("sha256").update(JSON.stringify(stablePayload)).digest("hex");
}

export function coerceBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    return ["1", "true", "yes", "y", "on"].includes(value.trim().toLowerCase());
  }

  return false;
}

export function getVideoEmbedUrl(videoUrl = "") {
  if (!videoUrl) {
    return "";
  }

  try {
    const url = new URL(videoUrl);

    if (url.pathname.endsWith("/watch")) {
      url.pathname = url.pathname.replace(/\/watch$/, "/iframe");
    }

    return url.toString();
  } catch {
    if (videoUrl.endsWith("/watch")) {
      return `${videoUrl.slice(0, -"/watch".length)}/iframe`;
    }

    return "";
  }
}

export function buildSiteVideoFields({
  streamVideoUrl = "",
  originalVideoUrl = "",
  mirrorVideoUrl = ""
} = {}) {
  const normalizedStreamUrl = toText(streamVideoUrl);
  const normalizedOriginalUrl = toText(originalVideoUrl);
  const normalizedMirrorUrl = toText(mirrorVideoUrl);
  const playbackUrl = normalizedMirrorUrl || normalizedOriginalUrl || "";

  return {
    videoUrl: normalizedStreamUrl,
    originalVideoUrl: normalizedOriginalUrl,
    mirrorVideoUrl: normalizedMirrorUrl,
    playbackUrl,
    videoEmbedUrl: normalizedMirrorUrl ? "" : getVideoEmbedUrl(normalizedStreamUrl)
  };
}

export function rowValuesToObject(values, fieldOrder) {
  return Object.fromEntries(fieldOrder.map((fieldName, index) => [fieldName, values[index] ?? ""]));
}

function toText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

export function normalizePromptToRow(prompt, { locale, model, gallerySlug = "", syncedAt, active = true }) {
  const primaryVideo = getPrimaryVideo(prompt);

  const row = {
    "Prompt ID": String(prompt.id ?? ""),
    Title: prompt.title || "",
    Description: prompt.description || "",
    Prompt: prompt.content || "",
    "Translated Prompt": prompt.translatedContent || "",
    Language: prompt.language || "",
    Featured: Boolean(prompt.featured),
    Active: Boolean(active),
    "Source Link": prompt.sourceLink || "",
    "Source Published At": prompt.sourcePublishedAt || "",
    Author: prompt.author?.name || "",
    "Author Link": prompt.author?.link || "",
    "Video URL": primaryVideo?.sourceUrl || "",
    "Thumbnail URL": primaryVideo?.thumbnail || "",
    "Reference Images": joinUrlList(prompt.referenceImages || prompt.sourceReferenceImages || []),
    "Detail URL": `https://youmind.com/${locale}/${gallerySlug || `${model}-prompts`}?id=${prompt.id}`,
    Model: model,
    "Content Hash": "",
    "Synced At": syncedAt
  };

  row["Content Hash"] = buildContentHash(row);

  return row;
}

export function rowToValues(row, fieldOrder) {
  return fieldOrder.map((fieldName) => row[fieldName] ?? "");
}

export function promptToSitePrompt(prompt, { locale, gallerySlug = "", model = "" }) {
  const primaryVideo = getPrimaryVideo(prompt);
  const videoFields = buildSiteVideoFields({
    streamVideoUrl: primaryVideo?.sourceUrl || "",
    originalVideoUrl: extractOriginalVideoUrl(prompt)
  });

  return {
    id: prompt.id,
    title: prompt.title || "",
    description: prompt.description || "",
    prompt: prompt.content || "",
    translatedPrompt: prompt.translatedContent || "",
    language: prompt.language || "",
    featured: Boolean(prompt.featured),
    sourceLink: prompt.sourceLink || "",
    sourcePublishedAt: prompt.sourcePublishedAt || "",
    authorName: prompt.author?.name || "",
    authorLink: prompt.author?.link || "",
    detailUrl: prompt.detailUrl || `https://youmind.com/${locale}/${gallerySlug || `${model}-prompts`}?id=${prompt.id}`,
    ...videoFields,
    thumbnailUrl: primaryVideo?.thumbnail || "",
    referenceImages: splitUrlList(prompt.referenceImages || prompt.sourceReferenceImages || [])
  };
}

export function rowObjectToSitePrompt(row) {
  const videoFields = buildSiteVideoFields({
    streamVideoUrl: row["Video URL"],
    originalVideoUrl: row["Original Video URL"],
    mirrorVideoUrl: row["Mirror Video URL"]
  });

  return {
    id: toText(row["Prompt ID"]),
    title: toText(row.Title),
    description: toText(row.Description),
    prompt: toText(row.Prompt),
    translatedPrompt: toText(row["Translated Prompt"]),
    language: toText(row.Language),
    featured: coerceBoolean(row.Featured),
    active: coerceBoolean(row.Active),
    sourceLink: toText(row["Source Link"]),
    sourcePublishedAt: toText(row["Source Published At"]),
    authorName: toText(row.Author),
    authorLink: toText(row["Author Link"]),
    detailUrl: toText(row["Detail URL"]),
    ...videoFields,
    thumbnailUrl: toText(row["Thumbnail URL"]),
    referenceImages: splitUrlList(row["Reference Images"]),
    model: toText(row.Model),
    contentHash: toText(row["Content Hash"]),
    syncedAt: toText(row["Synced At"]),
    mirrorStatus: toText(row["Mirror Status"]),
    mirrorSyncedAt: toText(row["Mirror Synced At"])
  };
}
