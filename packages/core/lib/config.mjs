import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// packages/core/lib -> hub root (3 levels up)
export const ROOT = path.resolve(__dirname, "../../..");
export const SOURCES_DIR = path.join(ROOT, "sources");
export const DIST_DIR = path.join(ROOT, "dist");

// ----- active source (selected per-process via YOUMIND_SOURCE=<slug>) -----
const ACTIVE_SLUG = (process.env.YOUMIND_SOURCE || "").trim();

export function loadSourceConfig(slug) {
  const configPath = path.join(SOURCES_DIR, slug, "config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

export function listSourceSlugs() {
  if (!fs.existsSync(SOURCES_DIR)) {
    return [];
  }
  return fs
    .readdirSync(SOURCES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(path.join(SOURCES_DIR, slug, "config.json")))
    .sort();
}

export const ACTIVE_SOURCE = ACTIVE_SLUG ? loadSourceConfig(ACTIVE_SLUG) : null;

// per-source data/cache; the aggregated site is shared under dist/
// Static sources (no API) keep their snapshot committed under sources/<slug>/;
// API sources keep fetched snapshots under data/<slug>/.
const _isStaticSource = Boolean(ACTIVE_SOURCE && ACTIVE_SOURCE.kind === "static");
export const DATA_DIR = ACTIVE_SOURCE
  ? _isStaticSource
    ? path.join(SOURCES_DIR, ACTIVE_SOURCE.slug)
    : path.join(ROOT, "data", ACTIVE_SOURCE.slug)
  : path.join(ROOT, "data");
export const CACHE_DIR = resolveDirPath(
  process.env.YOUMIND_CACHE_DIR || "",
  path.join(ROOT, ".cache", ACTIVE_SOURCE ? ACTIVE_SOURCE.slug : "default")
);
export const SITE_DIR = DIST_DIR;

export const LOCAL_CONFIG_PATH = ACTIVE_SOURCE
  ? path.join(SOURCES_DIR, ACTIVE_SOURCE.slug, ".local.json")
  : path.join(ROOT, ".local.json");
export const GLOBAL_CONFIG_DIR = path.join(os.homedir(), ".config", "youmind-hub");
export const GLOBAL_CONFIG_PATH = path.join(GLOBAL_CONFIG_DIR, "config.json");
export const DEFAULT_R2_MANIFEST_PATH = path.join(GLOBAL_CONFIG_DIR, "r2-videos.json");

const _api = (ACTIVE_SOURCE && ACTIVE_SOURCE.api) || {};
export const DEFAULT_MODEL = process.env.YOUMIND_MODEL || _api.model || "";
export const DEFAULT_LOCALE = process.env.YOUMIND_LOCALE || _api.locale || "zh-CN";
export const DEFAULT_ENDPOINT = process.env.YOUMIND_ENDPOINT || _api.endpoint || "prompts";
export const DEFAULT_GALLERY_SLUG =
  process.env.YOUMIND_GALLERY_SLUG || _api.gallerySlug || `${DEFAULT_MODEL}-prompts`;

function expandPathLikeShell(value) {
  if (!value) {
    return value;
  }

  let expanded = value.trim();

  if (expanded === "~") {
    expanded = os.homedir();
  } else if (expanded.startsWith("~/")) {
    expanded = path.join(os.homedir(), expanded.slice(2));
  }

  expanded = expanded.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (_, name) => process.env[name] || "");

  return expanded;
}

function resolveDirPath(value, fallback) {
  if (!value) {
    return fallback;
  }

  const expanded = expandPathLikeShell(value);
  return path.isAbsolute(expanded) ? expanded : path.resolve(ROOT, expanded);
}

function resolveConfigPath(value, fallback) {
  if (!value) {
    return fallback;
  }

  const expanded = expandPathLikeShell(value);
  return path.isAbsolute(expanded) ? expanded : path.resolve(ROOT, expanded);
}

export function ensureDirSync(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

export function writeJsonSync(filePath, value) {
  ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function loadLocalConfig() {
  return readJsonIfExists(LOCAL_CONFIG_PATH) ?? {};
}

export function writeLocalConfig(config) {
  writeJsonSync(LOCAL_CONFIG_PATH, config);
}

export function loadGlobalConfig() {
  const globalConfigPath = resolveConfigPath(process.env.YOUMIND_GLOBAL_CONFIG_PATH || "", GLOBAL_CONFIG_PATH);
  return readJsonIfExists(globalConfigPath) ?? {};
}

export function writeGlobalConfig(config) {
  const globalConfigPath = resolveConfigPath(process.env.YOUMIND_GLOBAL_CONFIG_PATH || "", GLOBAL_CONFIG_PATH);
  writeJsonSync(globalConfigPath, config);
}

function mergeConfig(globalConfig, localConfig) {
  return {
    ...globalConfig,
    ...localConfig,
    r2: {
      ...(globalConfig?.r2 || {}),
      ...(localConfig?.r2 || {})
    }
  };
}

export function loadMergedConfig() {
  return mergeConfig(loadGlobalConfig(), loadLocalConfig());
}

export function resolveSyncTarget({ requireBase = true } = {}) {
  const merged = loadMergedConfig();
  const api = (ACTIVE_SOURCE && ACTIVE_SOURCE.api) || {};

  const config = {
    slug: (ACTIVE_SOURCE && ACTIVE_SOURCE.slug) || "",
    model: process.env.YOUMIND_MODEL || api.model || merged.model || DEFAULT_MODEL,
    locale: process.env.YOUMIND_LOCALE || api.locale || merged.locale || DEFAULT_LOCALE,
    endpoint: process.env.YOUMIND_ENDPOINT || api.endpoint || merged.endpoint || DEFAULT_ENDPOINT,
    gallerySlug:
      process.env.YOUMIND_GALLERY_SLUG || api.gallerySlug || merged.gallerySlug || DEFAULT_GALLERY_SLUG,
    kind: (ACTIVE_SOURCE && ACTIVE_SOURCE.kind) || "image",
    baseToken:
      process.env.FEISHU_BASE_TOKEN ||
      (ACTIVE_SOURCE && ACTIVE_SOURCE.feishu && ACTIVE_SOURCE.feishu.baseToken) ||
      merged.baseToken ||
      "",
    tableId:
      process.env.FEISHU_TABLE_ID ||
      (ACTIVE_SOURCE && ACTIVE_SOURCE.feishu && ACTIVE_SOURCE.feishu.tableId) ||
      merged.tableId ||
      "",
    baseName: (ACTIVE_SOURCE && ACTIVE_SOURCE.title) || merged.baseName || "YouMind Prompt Library",
    branding: (ACTIVE_SOURCE && ACTIVE_SOURCE.branding) || {}
  };

  if (requireBase && (!config.baseToken || !config.tableId)) {
    throw new Error(
      `Missing Feishu base target for source "${config.slug}". ` +
        `Set FEISHU_BASE_TOKEN / FEISHU_TABLE_ID or create sources/${config.slug}/.local.json first.`
    );
  }

  return config;
}

function normalizeUrlBase(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

export function resolveR2Config({ requireBucket = false, requirePublicUrl = false } = {}) {
  const merged = loadMergedConfig();
  const r2 = (ACTIVE_SOURCE && ACTIVE_SOURCE.r2) || {};
  const manifestPath = resolveConfigPath(
    process.env.YOUMIND_R2_MANIFEST_PATH || r2.manifestPath || merged.r2?.manifestPath || "",
    DEFAULT_R2_MANIFEST_PATH
  );
  const config = {
    enabled:
      process.env.YOUMIND_R2_ENABLED === "1" ||
      process.env.ENABLE_R2_MIRROR === "1" ||
      r2.enabled === true ||
      merged.r2?.enabled === true,
    bucketName:
      process.env.YOUMIND_R2_BUCKET ||
      process.env.R2_BUCKET_NAME ||
      r2.bucketName ||
      r2.bucket ||
      merged.r2?.bucketName ||
      merged.r2?.bucket ||
      "",
    publicUrlBase: normalizeUrlBase(
      process.env.YOUMIND_R2_PUBLIC_URL_BASE ||
        process.env.R2_PUBLIC_URL_BASE ||
        r2.publicUrlBase ||
        r2.publicUrl ||
        merged.r2?.publicUrlBase ||
        merged.r2?.publicUrl ||
        ""
    ),
    location: process.env.YOUMIND_R2_LOCATION || r2.location || merged.r2?.location || "apac",
    keyPrefix: String(
      process.env.YOUMIND_R2_KEY_PREFIX || r2.keyPrefix || merged.r2?.keyPrefix || "videos"
    ).replace(/^\/+|\/+$/g, ""),
    manifestPath
  };

  if (requireBucket && !config.bucketName) {
    throw new Error(
      "Missing R2 bucket name. Set YOUMIND_R2_BUCKET / R2_BUCKET_NAME or configure r2.bucketName in the source config."
    );
  }

  if (requirePublicUrl && !config.publicUrlBase) {
    throw new Error(
      "Missing R2 public URL base. Set YOUMIND_R2_PUBLIC_URL_BASE or configure r2.publicUrlBase in the source config."
    );
  }

  return config;
}

export function resolveFeishuAppCredentials() {
  const appId = process.env.FEISHU_APP_ID || "";
  const appSecret = process.env.FEISHU_APP_SECRET || "";

  if (!appId || !appSecret) {
    throw new Error("Missing FEISHU_APP_ID or FEISHU_APP_SECRET.");
  }

  return { appId, appSecret };
}
