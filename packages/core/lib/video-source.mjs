import path from "path";
import { readJsonIfExists, writeJsonSync } from "./config.mjs";

export function loadMirrorManifest(manifestPath) {
  const manifest = readJsonIfExists(manifestPath);

  if (!manifest || typeof manifest !== "object") {
    return {
      version: 1,
      updatedAt: "",
      items: {}
    };
  }

  return {
    version: manifest.version || 1,
    updatedAt: manifest.updatedAt || "",
    items: manifest.items && typeof manifest.items === "object" ? manifest.items : {}
  };
}

export function writeMirrorManifest(manifestPath, manifest) {
  writeJsonSync(manifestPath, {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: manifest.items || {}
  });
}

function sanitizeObjectSegment(value, fallback) {
  const normalized = String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || fallback;
}

export function getObjectExtension(videoUrl) {
  try {
    const pathname = new URL(videoUrl).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return ext || ".mp4";
  } catch {
    return ".mp4";
  }
}

export function buildMirrorObjectKey({ keyPrefix = "videos", locale, promptId, videoUrl }) {
  const prefix = sanitizeObjectSegment(keyPrefix, "videos");
  const localeSegment = sanitizeObjectSegment(locale, "default");
  const promptSegment = sanitizeObjectSegment(promptId, "unknown");
  const extension = getObjectExtension(videoUrl);

  return `${prefix}/${localeSegment}/${promptSegment}${extension}`;
}

export function buildMirrorVideoUrl(publicUrlBase, objectKey) {
  return `${String(publicUrlBase || "").replace(/\/+$/, "")}/${objectKey.replace(/^\/+/, "")}`;
}

export function getMirrorRecord(manifest, promptId, originalVideoUrl = "") {
  const item = manifest?.items?.[String(promptId)];

  if (!item) {
    return null;
  }

  if (originalVideoUrl && item.originalVideoUrl && item.originalVideoUrl !== originalVideoUrl) {
    return null;
  }

  return item;
}
