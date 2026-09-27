export const FIELD_DEFINITIONS = [
  { name: "Prompt ID", type: "text" },
  { name: "Title", type: "text" },
  { name: "Description", type: "text" },
  { name: "Prompt", type: "text" },
  { name: "Translated Prompt", type: "text" },
  { name: "Language", type: "text" },
  { name: "Featured", type: "checkbox" },
  { name: "Active", type: "checkbox" },
  { name: "Source Link", type: "text" },
  { name: "Source Published At", type: "text" },
  { name: "Author", type: "text" },
  { name: "Author Link", type: "text" },
  { name: "Video URL", type: "text" },
  { name: "Thumbnail URL", type: "text" },
  { name: "Reference Images", type: "text" },
  { name: "Detail URL", type: "text" },
  { name: "Model", type: "text" },
  { name: "Content Hash", type: "text" },
  { name: "Synced At", type: "text" }
];

export const MIRROR_FIELD_DEFINITIONS = [
  { name: "Original Video URL", type: "text" },
  { name: "Mirror Video URL", type: "text" },
  { name: "Mirror Status", type: "text" },
  { name: "Mirror Synced At", type: "text" }
];

export const FIELD_ORDER = FIELD_DEFINITIONS.map((field) => field.name);
export const MIRROR_FIELD_ORDER = MIRROR_FIELD_DEFINITIONS.map((field) => field.name);
export const ALL_FIELD_DEFINITIONS = [...FIELD_DEFINITIONS, ...MIRROR_FIELD_DEFINITIONS];

export const LOOKUP_FIELDS = ["Prompt ID", "Content Hash", "Active"];
