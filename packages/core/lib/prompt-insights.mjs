import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const RULES_PATH = path.resolve(__dirname, "../config/prompt-insights.json");

function readRules() {
  return JSON.parse(fs.readFileSync(RULES_PATH, "utf8"));
}

function compilePatternRule(rule) {
  return {
    ...rule,
    pattern: new RegExp(rule.pattern, rule.flags || "i")
  };
}

export const PROMPT_INSIGHT_RULES = readRules();
export const TAG_DEFINITIONS = PROMPT_INSIGHT_RULES.tags.map(compilePatternRule);
export const GENRE_DEFINITIONS = PROMPT_INSIGHT_RULES.genres.map(compilePatternRule);
export const TERM_GROUPS = PROMPT_INSIGHT_RULES.termGroups;

const SCORE_MODULES = PROMPT_INSIGHT_RULES.scoreModules;
const BONUS_MODULES = PROMPT_INSIGHT_RULES.bonusModules;
const TIME_SEGMENT_PATTERN = new RegExp(PROMPT_INSIGHT_RULES.timeSegmentPattern, "g");

function toText(value) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function getPromptText(prompt) {
  return toText(prompt.translatedPrompt || prompt.translatedContent || prompt.prompt || prompt.content);
}

export function countTimeSegments(text) {
  return text.match(TIME_SEGMENT_PATTERN)?.length || 0;
}

export function getStructureLevel(length) {
  return (
    PROMPT_INSIGHT_RULES.structureLevels.find(
      (level) => !Number.isFinite(level.maxLength) || length < level.maxLength
    ) || PROMPT_INSIGHT_RULES.structureLevels.at(-1)
  );
}

function getScoreLabel(score) {
  const match = PROMPT_INSIGHT_RULES.scoreLabels.find((scoreLabel) => score >= scoreLabel.min);
  return match?.label || "未评分";
}

export function analyzePromptForSite(prompt) {
  const promptText = getPromptText(prompt);
  const combinedText = [prompt.title, prompt.description, promptText].map(toText).filter(Boolean).join("\n");
  const genreText = [prompt.title, prompt.description].map(toText).filter(Boolean).join("\n") || promptText;
  const tags = TAG_DEFINITIONS.filter((tag) => tag.pattern.test(combinedText)).map(({ key, label }) => ({
    key,
    label
  }));
  const tagKeys = new Set(tags.map((tag) => tag.key));
  const genres = GENRE_DEFINITIONS.filter((genre) => genre.pattern.test(genreText)).map(
    ({ key, label }) => ({
      key,
      label
    })
  );
  const referenceImages = Array.isArray(prompt.referenceImages) ? prompt.referenceImages : [];
  const inputModes = [{ key: "text", label: "文本" }];

  if (referenceImages.length > 0 || tagKeys.has("reference_image")) {
    inputModes.push({ key: "image", label: "图像参考" });
  }

  if (tagKeys.has("reference_video")) {
    inputModes.push({ key: "video", label: "视频参考" });
  }

  if (tagKeys.has("reference_audio")) {
    inputModes.push({ key: "audio", label: "音频参考" });
  }

  const scoreModules = SCORE_MODULES.filter((key) => tagKeys.has(key));
  const bonusModules = BONUS_MODULES.filter((key) => tagKeys.has(key));
  const scoreValue = Math.min(10, scoreModules.length + bonusModules.length);
  const length = promptText.length;

  return {
    length,
    structureLevel: getStructureLevel(length),
    score: {
      value: scoreValue,
      max: 10,
      label: getScoreLabel(scoreValue),
      modules: [...scoreModules, ...bonusModules]
    },
    tags,
    genres,
    inputModes,
    timeSegmentCount: countTimeSegments(promptText)
  };
}
