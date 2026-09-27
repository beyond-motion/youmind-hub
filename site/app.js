const state = {
  prompts: [],
  filtered: [],
  featuredOnly: false,
  query: "",
  genreFilter: "",
  levelFilter: "",
  tagFilter: "",
  builderGenreOptions: [],
  modalPromptMode: "translated",
  activePrompt: null,
  lastRemixPrompt: "",
  lastRemixDraft: null,
  generatingRemix: false
};

const elements = {
  total: document.querySelector("#stat-total"),
  featured: document.querySelector("#stat-featured"),
  sync: document.querySelector("#stat-sync"),
  source: document.querySelector("#stat-source"),
  search: document.querySelector("#search-input"),
  clear: document.querySelector("#clear-search"),
  toggleFeatured: document.querySelector("#toggle-featured"),
  genreFilter: document.querySelector("#genre-filter"),
  levelFilter: document.querySelector("#level-filter"),
  tagFilter: document.querySelector("#tag-filter"),
  builderPanel: document.querySelector("#builder-panel"),
  builderSummaryLine: document.querySelector("#builder-summary-line"),
  builderTemplate: document.querySelector("#builder-template"),
  builderGenre: document.querySelector("#builder-genre"),
  builderRatio: document.querySelector("#builder-ratio"),
  builderDuration: document.querySelector("#builder-duration"),
  builderStyle: document.querySelector("#builder-style"),
  builderSubject: document.querySelector("#builder-subject"),
  builderScene: document.querySelector("#builder-scene"),
  builderAction: document.querySelector("#builder-action"),
  builderCamera: document.querySelector("#builder-camera"),
  builderLighting: document.querySelector("#builder-lighting"),
  builderAudio: document.querySelector("#builder-audio"),
  builderConstraints: document.querySelector("#builder-constraints"),
  builderOutput: document.querySelector("#builder-output"),
  builderReferences: document.querySelector("#builder-references"),
  builderScore: document.querySelector("#builder-score"),
  remixBuilder: document.querySelector("#remix-builder"),
  builderRemix: document.querySelector("#builder-remix"),
  remixOutput: document.querySelector("#remix-output"),
  copyBuilder: document.querySelector("#copy-builder"),
  copyRemix: document.querySelector("#copy-remix"),
  filterBuilder: document.querySelector("#filter-builder"),
  resetBuilder: document.querySelector("#reset-builder"),
  useRemix: document.querySelector("#use-remix"),
  resultsCount: document.querySelector("#results-count"),
  cards: document.querySelector("#cards"),
  empty: document.querySelector("#empty-state"),
  modal: document.querySelector("#detail-modal"),
  modalMedia: document.querySelector("#modal-media"),
  modalBadge: document.querySelector("#modal-badge"),
  modalLanguage: document.querySelector("#modal-language"),
  modalDate: document.querySelector("#modal-date"),
  modalTitle: document.querySelector("#modal-title"),
  modalDescription: document.querySelector("#modal-description"),
  modalInsights: document.querySelector("#modal-insights"),
  modalVideo: document.querySelector("#modal-video"),
  modalSource: document.querySelector("#modal-source"),
  modalDetail: document.querySelector("#modal-detail"),
  modalPrompt: document.querySelector("#modal-prompt"),
  modalRelated: document.querySelector("#modal-related"),
  tabTranslated: document.querySelector("#tab-translated"),
  tabOriginal: document.querySelector("#tab-original"),
  closeModal: document.querySelector("#close-modal"),
  copyPrompt: document.querySelector("#copy-prompt"),
  copyTemplate: document.querySelector("#copy-template"),
  useBuilder: document.querySelector("#use-builder")
};

function formatDate(isoString) {
  if (!isoString) {
    return "Unknown";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getSearchText(prompt) {
  const analysis = getPromptAnalysis(prompt);

  return [
    prompt.title,
    prompt.description,
    prompt.authorName,
    prompt.prompt,
    prompt.translatedPrompt,
    analysis.structureLevel.label,
    analysis.score.label,
    ...analysis.tags.map((tag) => tag.label),
    ...analysis.genres.map((genre) => genre.label),
    ...analysis.inputModes.map((mode) => mode.label)
  ]
    .join("\n")
    .toLowerCase();
}

function getPromptAnalysis(prompt) {
  return (
    prompt.analysis || {
      length: getDisplayPromptText(prompt).length,
      structureLevel: { key: "unknown", label: "未分析", shortLabel: "未分析" },
      score: { value: 0, max: 10, label: "未评分", modules: [] },
      tags: [],
      genres: [],
      inputModes: [{ key: "text", label: "文本" }],
      timeSegmentCount: 0
    }
  );
}

function getPromptLevel(prompt) {
  return getPromptAnalysis(prompt).structureLevel?.key || "";
}

function hasPromptGenre(prompt, genreKey) {
  return getPromptAnalysis(prompt).genres.some((genre) => genre.key === genreKey);
}

function hasPromptTag(prompt, tagKey) {
  return getPromptAnalysis(prompt).tags.some((tag) => tag.key === tagKey);
}

function createCountOptions(items, getItems) {
  const counts = new Map();
  const labels = new Map();

  for (const item of items) {
    for (const option of getItems(item)) {
      if (!option?.key) {
        continue;
      }

      counts.set(option.key, (counts.get(option.key) || 0) + 1);
      labels.set(option.key, option.label || option.key);
    }
  }

  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labels.get(key), count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "zh-CN"));
}

function setSelectOptions(select, placeholder, options) {
  select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>`;

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.key;
    element.textContent = `${option.label} (${option.count})`;
    select.appendChild(element);
  }
}

function setBuilderGenreOptions(options) {
  elements.builderGenre.innerHTML = `<option value="">选择类型</option>`;

  for (const option of options) {
    const element = document.createElement("option");
    element.value = option.key;
    element.textContent = option.label;
    elements.builderGenre.appendChild(element);
  }
}

function populateFilters(prompts) {
  const genreOptions = createCountOptions(prompts, (prompt) => getPromptAnalysis(prompt).genres);
  const tagOptions = createCountOptions(prompts, (prompt) => getPromptAnalysis(prompt).tags);
  const levelOptions = createCountOptions(prompts, (prompt) => [getPromptAnalysis(prompt).structureLevel]);

  setSelectOptions(elements.genreFilter, "全部类型", genreOptions);
  setSelectOptions(elements.levelFilter, "全部结构", levelOptions);
  setSelectOptions(elements.tagFilter, "全部模块", tagOptions);
  state.builderGenreOptions = genreOptions;
  setBuilderGenreOptions(genreOptions);
}

function getDisplayPromptText(prompt) {
  return prompt.translatedPrompt || prompt.prompt || "";
}

function getActivePromptText() {
  if (!state.activePrompt) {
    return "";
  }

  return state.modalPromptMode === "translated"
    ? state.activePrompt.translatedPrompt || state.activePrompt.prompt || ""
    : state.activePrompt.prompt || state.activePrompt.translatedPrompt || "";
}

function getReferenceVideoUrl(prompt) {
  return prompt.mirrorVideoUrl || "";
}

function renderInlineChips(items, className = "insight-chip", limit = 5) {
  return items
    .slice(0, limit)
    .map((item) => `<span class="${className}">${escapeHtml(item.label || item.shortLabel || item.key)}</span>`)
    .join("");
}

function getCardInsightHtml(prompt) {
  const analysis = getPromptAnalysis(prompt);
  const genre = analysis.genres[0];
  const level = analysis.structureLevel;
  const score = analysis.score;
  const keyTags = analysis.tags.filter((tag) =>
    ["camera", "action", "scene", "audio", "timecoded_segments", "reference_image", "one_take"].includes(
      tag.key
    )
  );

  return `
    <div class="card-insights">
      <div class="score-pill" title="提示词结构完整度">${escapeHtml(score.label)} ${score.value}/${score.max}</div>
      ${level ? `<span class="insight-chip strong">${escapeHtml(level.shortLabel || level.label)}</span>` : ""}
      ${genre ? `<span class="insight-chip">${escapeHtml(genre.label)}</span>` : ""}
      ${renderInlineChips(keyTags, "insight-chip muted", 3)}
    </div>
  `;
}

function buildStructureTemplate(prompt) {
  const analysis = getPromptAnalysis(prompt);
  const hasTimecodes = analysis.tags.some((tag) => tag.key === "timecoded_segments");
  const hasAudio = analysis.tags.some((tag) => tag.key === "audio");
  const hasReference = analysis.inputModes.some((mode) => mode.key !== "text");

  if (hasTimecodes) {
    return `[目标]
15 秒，{画幅}，{类型}，核心看点：{冲突/转变/视觉奇观}。

[全局设定]
风格：{视觉风格、摄影质感、色调、光影}。
主体：{角色/物体外观与一致性锁定}。
场景：{地点、时间、天气、空间结构}。
${hasReference ? "参考：{参考图/视频/音频的用途}。\n" : ""}${hasAudio ? "声音：{BGM、环境音、音效、对白/口型同步}。\n" : ""}
[分镜]
0-5 秒：{建立镜头}。画面：{画面内容}。动作：{主体动作}。细节：{物理/表情/环境}。
5-10 秒：{升级镜头}。画面：{画面内容}。动作：{动作升级}。细节：{物理/表情/环境}。
10-15 秒：{高潮镜头}。画面：{画面内容}。动作：{高潮动作}。细节：{结尾余韵}。

[约束]
保持主体身份一致；无文字、字幕、水印、Logo；避免脸部变形、肢体异常、服装漂移。`;
  }

  return `[目标]
{时长} {画幅}，{视频类型}，核心看点是 {一句话创意}。

[风格]
{视觉风格}，{摄影/渲染质感}，{色调}，{光影}，{氛围}。

[主体]
{人物/物体描述}，{服装/外观/状态}，保持 {身份/脸部/服装/比例} 一致。

[场景]
{地点}，{时间}，{天气/环境}，{关键空间细节}。

[动作与镜头]
{景别/机位}，{镜头运动}，{主体动作}，{环境运动/物理细节}。

${hasReference ? "[参考]\n{参考图/视频/音频分别用于什么，不重复静态信息，重点描述运动变化}。\n\n" : ""}${hasAudio ? "[声音]\n{环境音}，{BGM/音效/对白}。\n\n" : ""}[约束]
无字幕、无水印、无 Logo；避免脸部变形、肢体异常、服装漂移。`;
}

function valueOrSlot(value, label) {
  const normalized = String(value || "").trim();
  return normalized || `{${label}}`;
}

function getSelectedOptionLabel(select, fallback = "") {
  return select.selectedOptions[0]?.textContent?.trim() || fallback;
}

function getBuilderTemplateLabel(template) {
  const option = [...elements.builderTemplate.options].find((item) => item.value === template);
  return option?.textContent?.trim() || "标准模板";
}

function getBuilderValues() {
  const genreLabel = elements.builderGenre.value ? getSelectedOptionLabel(elements.builderGenre, "视频") : "视频";

  return {
    template: elements.builderTemplate.value,
    genre: genreLabel,
    duration: valueOrSlot(elements.builderDuration.value, "时长"),
    ratio: valueOrSlot(elements.builderRatio.value, "画幅"),
    style: valueOrSlot(elements.builderStyle.value, "视觉风格"),
    subject: valueOrSlot(elements.builderSubject.value, "主体"),
    scene: valueOrSlot(elements.builderScene.value, "场景"),
    action: valueOrSlot(elements.builderAction.value, "核心动作"),
    camera: valueOrSlot(elements.builderCamera.value, "镜头语言"),
    lighting: valueOrSlot(elements.builderLighting.value, "光影色调"),
    audio: valueOrSlot(elements.builderAudio.value, "声音设计"),
    constraints: valueOrSlot(elements.builderConstraints.value, "约束")
  };
}

function buildPromptFromBuilder(values) {
  if (values.template === "minimal") {
    return `${values.duration}，${values.ratio}，${values.genre}短片。${values.subject}在${values.scene}中${values.action}。${values.camera}，${values.style}，${values.lighting}。声音：${values.audio}。${values.constraints}`;
  }

  if (values.template === "image") {
    return `以 @Image1 作为 ${values.subject} 的视觉参考，保持脸部、服装、身体比例和整体气质一致。

[目标]
${values.duration}，${values.ratio}，${values.genre}。核心看点：${values.action}。

[运动]
不要重复描述参考图里已经明确的静态信息，重点生成主体运动、环境运动和镜头运动。${values.camera}。

[场景与风格]
场景：${values.scene}。
风格：${values.style}，${values.lighting}。

[声音]
${values.audio}。

[约束]
${values.constraints}`;
  }

  if (values.template === "audio") {
    return `[目标]
${values.duration}，${values.ratio}，${values.genre}，主体是 ${values.subject}。

[视觉节奏]
场景：${values.scene}。
动作：${values.action}。
镜头：${values.camera}。
风格：${values.style}，${values.lighting}。

[音频]
${values.audio}。
口型自然同步；说话时嘴部轻微运动；停顿符合情绪和节奏。

[约束]
${values.constraints}`;
  }

  if (values.template === "storyboard") {
    return `[目标]
${values.duration}，${values.ratio}，${values.genre}，核心看点：${values.action}。

[全局设定]
风格：${values.style}，${values.lighting}。
主体：${values.subject}，全程保持身份、脸部、服装和比例一致。
场景：${values.scene}。
声音：${values.audio}。

[分镜]
0-5 秒：建立镜头。${values.camera}，清楚交代 ${values.subject} 所在空间；动作从静止或预备姿态开始，制造期待。
5-10 秒：动作升级。${values.subject} 执行 ${values.action}；加入可观察的物理细节，例如布料、头发、光影、尘埃、水花或环境反馈。
10-15 秒：高潮与收束。镜头推向关键表情、动作结果或视觉奇观，保留 0.5 秒余韵。

[约束]
${values.constraints}`;
  }

  return `[目标]
${values.duration}，${values.ratio}，${values.genre}，核心看点是 ${values.action}。

[风格]
${values.style}，${values.lighting}。

[主体]
${values.subject}，保持身份、脸部、服装和比例一致。

[场景]
${values.scene}。

[动作与镜头]
${values.camera}，主体执行 ${values.action}，环境有真实物理反馈。

[声音]
${values.audio}。

[约束]
${values.constraints}`;
}

function scoreBuilderValues(values) {
  const filled = [
    values.duration,
    values.ratio,
    values.genre !== "视频" ? values.genre : "",
    values.style,
    values.subject,
    values.scene,
    values.action,
    values.camera,
    values.lighting,
    values.audio,
    values.constraints
  ].filter((value) => value && !/^\{.+\}$/.test(value)).length;

  const bonus = values.template === "storyboard" || values.template === "image" || values.template === "audio" ? 1 : 0;
  const value = Math.min(10, Math.max(1, filled - 1 + bonus));
  const label = value >= 8 ? "生产级" : value >= 5 ? "标准型" : value >= 3 ? "灵感型" : "草图";

  return { value, label };
}

function getBuilderTemplateTag(template) {
  if (template === "storyboard") {
    return "timecoded_segments";
  }

  if (template === "image") {
    return "reference_image";
  }

  if (template === "audio") {
    return "audio";
  }

  return "";
}

function getBuilderReferencePrompts(values, limit = 4) {
  const templateTag = getBuilderTemplateTag(values.template);
  const genreKey = elements.builderGenre.value;
  const sourceText = [values.subject, values.scene, values.action, values.camera, values.style]
    .join(" ")
    .replace(/[{}]/g, "")
    .toLowerCase();
  const terms = sourceText
    .split(/[\s,，.。;；:：、]+/)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 16);

  return state.prompts
    .map((prompt) => {
      const analysis = getPromptAnalysis(prompt);
      const searchText = getSearchText(prompt);
      const genreMatch = genreKey && analysis.genres.some((genre) => genre.key === genreKey) ? 1 : 0;
      const tagMatch = templateTag && analysis.tags.some((tag) => tag.key === templateTag) ? 1 : 0;
      const termMatches = terms.filter((term) => searchText.includes(term)).length;
      const score = genreMatch * 8 + tagMatch * 5 + termMatches + prompt.featured * 2 + analysis.score.value / 10;

      return { prompt, score };
    })
    .filter((item) => item.score > 1)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.prompt);
}

function renderBuilderReferences(values) {
  if (!state.prompts.length) {
    elements.builderReferences.innerHTML = "";
    return;
  }

  const references = getBuilderReferencePrompts(values);

  if (references.length === 0) {
    elements.builderReferences.innerHTML = `
      <div class="builder-reference-head">
        <span>参考样本</span>
      </div>
      <p class="builder-reference-empty">继续补充类型、主体或动作后会出现匹配样本。</p>
    `;
    return;
  }

  elements.builderReferences.innerHTML = `
    <div class="builder-reference-head">
      <span>参考样本</span>
      <small>${references.length} 条</small>
    </div>
    <div class="builder-reference-list">
      ${references
        .map((reference) => {
          const analysis = getPromptAnalysis(reference);
          const genre = analysis.genres[0]?.label || analysis.structureLevel.shortLabel;

          return `
            <div class="builder-reference-item">
              <button class="builder-reference-open" type="button" data-id="${escapeHtml(String(reference.id))}">
                <span>${escapeHtml(reference.title || "Untitled")}</span>
                <small>${escapeHtml(genre || "未分类")} · ${escapeHtml(analysis.score.label)} ${analysis.score.value}/${analysis.score.max}</small>
              </button>
              <button class="builder-reference-use" type="button" data-id="${escapeHtml(String(reference.id))}">带入</button>
            </div>
          `;
        })
        .join("")}
    </div>
  `;

  elements.builderReferences.querySelectorAll(".builder-reference-open").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.id));
  });

  elements.builderReferences.querySelectorAll(".builder-reference-use").forEach((button) => {
    button.addEventListener("click", () => fillBuilderFromPrompt(button.dataset.id));
  });
}

function updateBuilderOutput() {
  const values = getBuilderValues();
  const prompt = buildPromptFromBuilder(values);
  const score = scoreBuilderValues(values);

  elements.builderOutput.textContent = prompt;
  elements.builderScore.textContent = `${score.label} ${score.value}/10`;
  elements.builderSummaryLine.textContent = `${getBuilderTemplateLabel(values.template)} · ${values.genre} · ${score.label} ${score.value}/10`;
  renderBuilderReferences(values);
}

function resetBuilder() {
  elements.builderTemplate.value = "storyboard";
  elements.builderGenre.value = "";
  elements.builderRatio.value = "16:9 横屏";
  elements.builderDuration.value = "15 秒";
  elements.builderStyle.value = "电影感，超写实，清晰主体，稳定镜头";
  elements.builderSubject.value = "";
  elements.builderScene.value = "";
  elements.builderAction.value = "";
  elements.builderCamera.value = "";
  elements.builderLighting.value = "";
  elements.builderAudio.value = "";
  elements.builderConstraints.value =
    "保持主体身份一致；无文字、字幕、水印、Logo；避免脸部变形、肢体异常、服装漂移。";
  updateBuilderOutput();
}

const remixPools = {
  action: {
    subjects: ["一位穿黑色机能夹克的女特技车手", "两名在雨夜巷口交错追逐的摩托骑手", "一名负伤但冷静的近未来快递员"],
    scenes: ["高架桥下的湿滑弯道，路面积水反射霓虹灯牌", "凌晨的地下停车场，警示灯闪烁，水汽从通风口涌出", "港口集装箱区，强风吹动塑料布和尘雾"],
    actions: ["高速漂移后贴近障碍物穿过窄道，最后急停回望", "短距离冲刺、翻越低墙并躲过迎面灯光", "在追逐中突然变向，利用环境制造错位和悬念"],
    cameras: ["低角度手持跟拍，关键动作时短暂慢动作，最后推到面部特写"],
    lighting: ["冷蓝环境光，橙色车灯边缘光，湿地反光和浅景深"],
    audio: ["轮胎摩擦声、急促呼吸、远处警笛、低频鼓点"]
  },
  anime_comic: {
    subjects: ["一位蓝色短发的高中剑道少女", "一名戴耳机的街头涂鸦少年", "一只机械翅膀逐渐展开的原创角色"],
    scenes: ["夕阳下的学校天台，云层被风快速推开", "涂鸦覆盖的地下通道，荧光灯偶尔闪烁", "城市屋顶边缘，远处有夸张的漫画速度线"],
    actions: ["从静止转为爆发式前冲，衣角和发丝形成夸张动势", "回头一笑后跳上栏杆，镜头跟随重心变化", "展开翅膀跃起，空气中出现手绘风冲击线"],
    cameras: ["漫画分格感的快速推拉镜头，最后定格到眼神特写"],
    lighting: ["高饱和暖色夕照，清晰轮廓光，少量赛璐璐阴影"],
    audio: ["轻快电子鼓点、鞋底摩擦声、短促风声"]
  },
  cyberpunk_scifi: {
    subjects: ["一位面部带透明 HUD 反射的仿生侦探", "一台小型四足维修机器人", "一名穿半透明雨衣的夜班数据走私者"],
    scenes: ["雨夜的垂直城市街区，悬浮广告在雾中闪烁", "废弃地铁站内，蓝色扫描光扫过墙面", "高楼天台的服务器冷却区，蒸汽和红色警报灯交替出现"],
    actions: ["扫描线扫过眼睛后快速转身，发现身后目标", "穿过水坑和电缆，避开落下的火花", "把发光芯片抛向空中，镜头跟随芯片落入掌心"],
    cameras: ["广角近距离跟拍，轻微镜头畸变，结尾环绕半圈"],
    lighting: ["青绿色霓虹主光，紫色反射，高对比雨夜阴影"],
    audio: ["雨声、电流噪声、低频合成器、远处广播失真"]
  },
  fantasy: {
    subjects: ["一位披银色斗篷的年轻召唤师", "一名手持破损王冠的流亡公主", "一只由水晶碎片组成的小型龙灵"],
    scenes: ["古老石桥横跨云雾峡谷，远处城堡被晨光照亮", "废弃王座厅，尘埃在光束中缓慢漂浮", "夜色森林里的发光湖面，萤火围绕主体旋转"],
    actions: ["抬手唤起微小光阵，光阵逐渐扩散成风暴", "从破碎台阶上回身，斗篷被气流掀起", "围绕主体盘旋后冲入湖面，掀起发光水纹"],
    cameras: ["缓慢推进的史诗感镜头，中段低角度仰拍，结尾广角展开空间"],
    lighting: ["金色晨光与蓝色魔法光交叠，体积雾明显"],
    audio: ["低沉弦乐、风声、轻微水晶震动声"]
  },
  product_ad: {
    subjects: ["一只磨砂黑智能耳机盒", "一瓶透明玻璃质感的高端香水", "一双银白色轻量跑鞋"],
    scenes: ["极简镜面台面，背景有柔和渐变和可控反射", "雨后城市橱窗前，产品悬浮在细微水汽中", "黑色摄影棚内，细窄光带勾勒产品轮廓"],
    actions: ["产品缓慢旋转，关键材质在光带扫过时显现", "水珠沿表面滑落，镜头推近展示细节", "从阴影中被光线揭示，最后定格在标志性轮廓"],
    cameras: ["微距推镜，浅景深，结尾切到稳定的产品英雄角度"],
    lighting: ["干净高反差布光，边缘光突出材质，背景不过曝"],
    audio: ["轻微机械开合声、低频品牌音效、空气感电子音乐"]
  },
  default: {
    subjects: ["一位穿深色风衣的年轻角色", "一名在城市边缘独自行走的摄影师", "一个被风吹动的透明装置艺术品"],
    scenes: ["雨后的城市天桥，远处灯光虚化", "清晨空旷广场，地面有长长影子", "傍晚海边公路，薄雾从路面掠过"],
    actions: ["停下脚步后缓慢转身，目光看向镜头外的动静", "穿过光影交错的空间，最后停在画面中心", "被风吹动并反射周围环境，形成细微变形"],
    cameras: ["稳定跟拍转为缓慢推近，结尾保持 0.5 秒余韵"],
    lighting: ["柔和自然光，局部边缘光，色调克制"],
    audio: ["环境风声、远处城市声、轻微低频铺底"]
  }
};

function getGenreLabelByKey(genreKey) {
  if (!genreKey) {
    return "视频";
  }

  const option = [...elements.builderGenre.options].find((item) => item.value === genreKey);
  return option?.textContent?.trim() || "视频";
}

function hashText(value) {
  return [...String(value || "")].reduce((total, character) => total + character.charCodeAt(0), 0);
}

function pickVariation(list, seed, offset = 0) {
  return list[(seed + offset) % list.length];
}

function createLocalRemixDraft(values) {
  const genreKey = elements.builderGenre.value || "default";
  const pool = remixPools[genreKey] || remixPools.default;
  const seed = hashText([values.subject, values.scene, values.action, Date.now()].join("|"));

  return cleanBuilderDraft({
    template: values.template,
    genre: elements.builderGenre.value,
    ratio: values.ratio,
    duration: values.duration,
    style: values.style,
    subject: pickVariation(pool.subjects, seed, 1),
    scene: pickVariation(pool.scenes, seed, 2),
    action: pickVariation(pool.actions, seed, 3),
    camera: pickVariation(pool.cameras, seed, 4),
    lighting: pickVariation(pool.lighting, seed, 5),
    audio: pickVariation(pool.audio, seed, 6),
    constraints: values.constraints
  });
}

function getBuilderValuesFromDraft(draft) {
  return {
    template: draft.template,
    genre: getGenreLabelByKey(draft.genre),
    duration: valueOrSlot(draft.duration, "时长"),
    ratio: valueOrSlot(draft.ratio, "画幅"),
    style: valueOrSlot(draft.style, "视觉风格"),
    subject: valueOrSlot(draft.subject, "主体"),
    scene: valueOrSlot(draft.scene, "场景"),
    action: valueOrSlot(draft.action, "核心动作"),
    camera: valueOrSlot(draft.camera, "镜头语言"),
    lighting: valueOrSlot(draft.lighting, "光影色调"),
    audio: valueOrSlot(draft.audio, "声音设计"),
    constraints: valueOrSlot(draft.constraints, "约束")
  };
}

function buildRemixInstruction(values) {
  return `你是专业视频提示词导演。基于下面的模板和类型，创建一个同类型但不同主体、不同场景的测试提示词。

要求：
1. 保持原模板结构和视频类型，不复制原主体、原场景、原动作。
2. 输出必须是可直接用于视频生成的完整提示词，不要解释，不要列表外说明。
3. 不要反复写模型名；除非必要，不要在正文中出现 Seedance 2.0。
4. 保留时长、画幅、镜头、声音、约束这些生产要素。

当前模板：${getBuilderTemplateLabel(values.template)}
当前类型：${values.genre}
时长：${values.duration}
画幅：${values.ratio}
风格：${values.style}
原主体：${values.subject}
原场景：${values.scene}
原动作：${values.action}
镜头：${values.camera}
光影：${values.lighting}
声音：${values.audio}
约束：${values.constraints}`;
}

async function createBrowserModelRemix(values) {
  const modelFactory = globalThis.LanguageModel || globalThis.ai?.languageModel;

  if (!modelFactory?.create) {
    return "";
  }

  if (modelFactory.availability) {
    const availability = await withTimeout(modelFactory.availability(), 1200);

    if (availability !== "available") {
      return "";
    }
  }

  const session = await withTimeout(modelFactory.create(), 4000);

  try {
    return await withTimeout(session.prompt(buildRemixInstruction(values)), 9000);
  } finally {
    session.destroy?.();
  }
}

function withTimeout(promise, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error("timeout")), timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function cleanGeneratedPrompt(value) {
  return String(value || "")
    .replace(/^```(?:\w+)?\s*/g, "")
    .replace(/```$/g, "")
    .replace(/^\s*(?:提示词|输出|结果|Prompt)[:：]\s*/i, "")
    .replace(/\bSeedance\s*2(?:\.0)?\b/gi, "")
    .replace(/\bSeedance\b/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function renderRemixPrompt(prompt, sourceLabel, draft = null) {
  state.lastRemixPrompt = prompt;
  state.lastRemixDraft = draft;
  elements.builderRemix.classList.remove("hidden");
  elements.remixOutput.textContent = `来源：${sourceLabel}\n\n${prompt}`;
}

async function generateBuilderRemix() {
  if (state.generatingRemix) {
    return;
  }

  openBuilderPanel();
  const values = getBuilderValues();
  const originalLabel = elements.remixBuilder.textContent;
  state.generatingRemix = true;
  elements.remixBuilder.disabled = true;
  elements.remixBuilder.textContent = "生成中...";
  elements.builderRemix.classList.remove("hidden");
  elements.remixOutput.textContent = "正在生成测试变体；如果当前浏览器没有可用的大模型，会立即切换到本地结构化生成。";

  try {
    const modelPrompt = cleanGeneratedPrompt(await createBrowserModelRemix(values));

    if (modelPrompt.length > 60) {
      state.lastRemixDraft = null;
      renderRemixPrompt(modelPrompt, "浏览器内置大模型");
      return;
    }
  } catch (error) {
    console.info("Browser model unavailable, using local remix.", error);
  } finally {
    state.generatingRemix = false;
    elements.remixBuilder.disabled = false;
    elements.remixBuilder.textContent = originalLabel;
  }

  const draft = createLocalRemixDraft(values);
  renderRemixPrompt(buildPromptFromBuilder(getBuilderValuesFromDraft(draft)), "本地结构化生成", draft);
}

function getBuilderDraftFromText(text) {
  const genreKey = elements.builderGenre.value;
  const fakePrompt = {
    id: "remix",
    title: "AI 测试变体",
    description: "",
    prompt: text,
    translatedPrompt: text,
    analysis: {
      length: text.length,
      structureLevel: { key: elements.builderTemplate.value === "storyboard" ? "storyboard" : "standard" },
      score: { value: 8, max: 10, label: "生产级", modules: [] },
      tags: [],
      genres: genreKey ? [{ key: genreKey, label: getGenreLabelByKey(genreKey) }] : [],
      inputModes: [{ key: "text", label: "文本" }],
      timeSegmentCount: 0
    }
  };
  const draft = getBuilderDraftFromPrompt(fakePrompt);

  return {
    ...draft,
    template: elements.builderTemplate.value,
    genre: genreKey
  };
}

async function useRemixInBuilder() {
  if (!state.lastRemixPrompt) {
    await generateBuilderRemix();
  }

  if (state.lastRemixPrompt) {
    applyBuilderDraft(state.lastRemixDraft || getBuilderDraftFromText(state.lastRemixPrompt));
  }
}

function normalizeSnippet(value, maxLength = 96) {
  const normalized = String(value || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s:：,，.。;；\-—\[\]【】]+/, "")
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trim()}...`;
}

function dedupeTextUnits(value) {
  const units = String(value || "")
    .split(/([,，;；。])/)
    .reduce((items, part, index, source) => {
      if (index % 2 === 0) {
        const separator = source[index + 1] || "";
        const text = part.trim();

        if (text) {
          items.push(`${text}${separator}`);
        }
      }

      return items;
    }, []);
  const seen = new Set();

  return units
    .filter((unit) => {
      const key = unit
        .replace(/[，,；;。]/g, "")
        .replace(/\s+/g, "")
        .toLowerCase();

      if (!key || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .join("")
    .replace(/[，,；;。]+$/g, "");
}

function cleanBuilderDraftValue(value, maxLength = 120) {
  const stripped = normalizeSnippet(value, maxLength * 2)
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\bSeedance\s*2(?:\.0)?\b/gi, "")
    .replace(/\bSeedance\b/gi, "")
    .replace(/\b(?:video\s*)?prompts?\b/gi, "")
    .replace(/提示词(?:框架|模板|生成器|库)?/g, "")
    .replace(/适用于|用于测试|用于生成|生成一个|请生成/gi, "")
    .replace(/[|｜]/g, "，")
    .replace(/([,，;；。])\s*\1+/g, "$1")
    .replace(/^[\s:：,，.。;；\-—【】\[\]()（）]+|[\s:：,，.。;；\-—【】\[\]()（）]+$/g, "")
    .trim();
  const deduped = dedupeTextUnits(stripped)
    .replace(/\s+([,，;；。])/g, "$1")
    .replace(/([,，;；。])\s+/g, "$1")
    .trim();

  return normalizeSnippet(deduped, maxLength);
}

function cleanBuilderDraft(draft) {
  return {
    ...draft,
    style: cleanBuilderDraftValue(draft.style, 120),
    subject: cleanBuilderDraftValue(draft.subject, 120),
    scene: cleanBuilderDraftValue(draft.scene, 140),
    action: cleanBuilderDraftValue(draft.action, 140),
    camera: cleanBuilderDraftValue(draft.camera, 120),
    lighting: cleanBuilderDraftValue(draft.lighting, 120),
    audio: cleanBuilderDraftValue(draft.audio, 120),
    constraints:
      cleanBuilderDraftValue(draft.constraints, 140) ||
      "保持主体身份一致；无文字、字幕、水印、Logo；避免脸部变形、肢体异常、服装漂移。"
  };
}

function splitPromptSegments(text) {
  return addTimelineBreaks(text)
    .split(/[\r\n。；;]+/)
    .map((segment) => normalizeSnippet(segment, 180))
    .filter(Boolean);
}

function getLabeledSegment(segments, labelPattern, maxLength = 96) {
  for (const segment of segments) {
    const match = segment.match(labelPattern);

    if (match?.[1]) {
      return cleanExtractedPhrase(match[1], maxLength);
    }
  }

  return "";
}

function getKeywordSegment(segments, keywords, maxLength = 96) {
  return cleanExtractedPhrase(
    segments.find((segment) => !isPromptMetaSegment(segment) && keywords.some((keyword) => segment.includes(keyword))) ||
      "",
    maxLength
  );
}

function isPromptMetaSegment(segment) {
  return /(?:这个|该|一份|一个|本提示|提示词|提示|旨在|用于|生成|设计|包含|指定|详细|创作|指导视频)/.test(
    segment
  );
}

function stripTimelineMarker(segment) {
  return String(segment || "")
    .replace(/^\s*(?:\[[^\]]+\]\s*)?(?:镜头\s*\d+\s*[：:]?\s*)?/i, "")
    .replace(/^\s*(?:\d+(?:\.\d+)?\s*(?:s|秒)|\d+(?:\.\d+)?\s*[-–—~至到]\s*\d+(?:\.\d+)?\s*(?:s|秒)?)[：:|｜\s-]*/i, "")
    .trim();
}

function hasTimelineMarker(segment) {
  return /(?:\d+(?:\.\d+)?\s*(?:[-–—~至到]\s*\d+(?:\.\d+)?\s*)?(?:s|秒)|\d+(?:\.\d+)?\s*[-–—~至到]\s*\d+(?:\.\d+)?)\s*[：:]|\[\s*\d{1,2}(?::\d{2})?\s*[-–—~至到]\s*\d{1,2}(?::\d{2})?\s*\]/i.test(
    segment
  );
}

function addTimelineBreaks(text) {
  return String(text || "")
    .replace(
      /\s*((?:\d+(?:\.\d+)?\s*(?:[-–—~至到]\s*\d+(?:\.\d+)?\s*)?(?:s|秒)|\d+(?:\.\d+)?\s*[-–—~至到]\s*\d+(?:\.\d+)?)\s*[：:])/gi,
      "\n$1"
    )
    .replace(/\s*(\[\s*\d{1,2}(?::\d{2})?\s*[-–—~至到]\s*\d{1,2}(?::\d{2})?\s*\])/g, "\n$1");
}

function splitClauses(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .split(/[，,。；;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cleanExtractedPhrase(value, maxLength = 120) {
  return cleanBuilderDraftValue(
    String(value || "")
      .replace(/^\s*(?:镜头\s*\d+|场景\s*\d+|动作|画面|主体|主角|主人公|角色|风格|声音|音效|BGM|镜头|机位|运镜|光影|光线|色调)\s*[:：-]?\s*/i, "")
      .replace(/^\s*(?:该提示|这个提示|本提示|一份提示|一个提示)[^，。；:：]*[:：,，]?\s*/g, ""),
    maxLength
  );
}

function getFirstContentSegment(segments) {
  return segments.find((segment) => !isPromptMetaSegment(segment)) || "";
}

function getStyleDraftFromSegments(segments) {
  const labeled = getLabeledSegment(segments, /(?:风格|style)[:：\]]\s*(.+)/i, 120);

  if (labeled) {
    return labeled;
  }

  const first = getFirstContentSegment(segments);
  const beforeTimeline = first
    .replace(/(?:^|[。；;])?\s*(?:\d+(?:\.\d+)?\s*(?:s|秒)|\d+(?:\.\d+)?\s*[-–—~至到]\s*\d+(?:\.\d+)?\s*(?:s|秒)?)[：:][\s\S]*$/i, "")
    .replace(/\b(?:16:9|9:16|1:1|4:3|3:4)\b|横屏|竖屏|portrait|landscape/gi, "")
    .replace(/^\s*[，,。；;]+|[，,。；;]+\s*$/g, "");

  return cleanExtractedPhrase(beforeTimeline, 120);
}

function getSubjectDraftFromSegments(contentSegments, descriptionSegments) {
  const labeled =
    getLabeledSegment(contentSegments, /(?:主体|角色|人物|主角|主人公|女主|男主)[:：\]]\s*(.+)/i, 120) ||
    getLabeledSegment(contentSegments, /(?:主体|角色|人物|主角|主人公|女主|男主)(?:是|为)\s*(.+?)(?:[。；;]|$)/i, 120);

  if (labeled) {
    return labeled;
  }

  for (const segment of contentSegments) {
    const cleaned = stripTimelineMarker(segment);
    const match = cleaned.match(/((?:一位|一名|一个|一只|两位|两名|一群)[^。；;]{4,150}?)(?=，(?:身穿|穿着|戴着|双手|手持|BGM|镜头|她|他|它|他们|她们|开始|正在|慢慢|突然)|。|；|$)/);

    if (match?.[1]) {
      return cleanExtractedPhrase(match[1], 120);
    }
  }

  return (
    getLabeledSegment(descriptionSegments, /(?:主角|主体|人物|角色)(?:是|为)\s*(.+?)(?:[。；;]|$)/i, 100) ||
    getKeywordSegment(contentSegments, ["主角", "女主", "男主", "驾驶员", "模特", "角色", "人物", "主体", "跑车", "女孩", "男孩", "少年", "少女"], 100)
  );
}

function getSceneDraftFromSegments(contentSegments, descriptionSegments) {
  const labeled = getLabeledSegment(contentSegments, /(?:场景|地点|环境|背景)[:：\]]\s*(.+)/i, 140);

  if (labeled) {
    return labeled;
  }

  for (const segment of contentSegments) {
    if (!hasTimelineMarker(segment) && /(?:风格|色调|氛围|画幅|横屏|竖屏|MV|视频)/i.test(segment)) {
      continue;
    }

    const clauses = splitClauses(stripTimelineMarker(segment));
    const firstSubjectIndex = clauses.findIndex((clause) => /(?:一位|一名|一个|一只|两位|两名|一群|主角|女主|男主)/.test(clause));
    const sceneClauses = clauses
      .slice(0, firstSubjectIndex > 0 ? firstSubjectIndex : Math.min(clauses.length, 3))
      .filter((clause) => !/(?:镜头|中景|特写|全景|近景|远景|推近|拉远|机位|俯拍|仰拍|低角度|高角度)/.test(clause))
      .filter((clause) => /(?:城市|街头|夜景|霓虹|卧室|室内|户外|森林|湖|山|海|广场|学校|图书馆|房间|走廊|墙|天空|地面|背景|场景)/.test(clause));

    if (sceneClauses.length) {
      return cleanExtractedPhrase(sceneClauses.slice(0, 3).join("，"), 140);
    }
  }

  return getKeywordSegment(descriptionSegments, ["场景", "地点", "环境", "背景"], 120);
}

function getActionDraftFromSegments(contentSegments, descriptionSegments) {
  const labeled = getLabeledSegment(contentSegments, /(?:动作|核心看点|剧情|内容)[:：\]]\s*(.+)/i, 140);

  if (labeled) {
    return labeled;
  }

  const actionClauses = [];

  for (const segment of contentSegments) {
    if (!hasTimelineMarker(segment) && /(?:风格|色调|氛围|画幅|横屏|竖屏|MV|视频)/i.test(segment)) {
      continue;
    }

    for (const clause of splitClauses(stripTimelineMarker(segment))) {
      if (
        /(?:开始|举起|张嘴|说唱|Rap|跳舞|转身|奔跑|跳跃|行走|凝视|飞行|坠落|爆炸|对决|加速|漂移|驾驶|冲刺|穿过|追逐|伸展|揉|哈欠|看向|回望|拍击|落下|旋转)/i.test(
          clause
        ) &&
        !/(?:镜头|机位|特写|全景|中景|低角度|高角度|俯拍|仰拍|剪辑)/.test(clause)
      ) {
        actionClauses.push(clause);
      }
    }

    if (actionClauses.length >= 2) {
      break;
    }
  }

  if (actionClauses.length) {
    return cleanExtractedPhrase(actionClauses.slice(0, 2).join("，"), 140);
  }

  return getKeywordSegment(descriptionSegments, ["动作", "剧情", "内容"], 120);
}

function getCameraDraftFromSegments(contentSegments, descriptionSegments) {
  const labeled = getLabeledSegment(contentSegments, /(?:镜头|机位|运镜|画面)[:：\]]\s*(.+)/i, 120);

  if (labeled) {
    return labeled;
  }

  const clauses = [];

  for (const segment of contentSegments) {
    for (const clause of splitClauses(stripTimelineMarker(segment))) {
      if (
        /(?:镜头|机位|特写|中景|全景|近景|远景|广角|低角度|高角度|俯拍|仰拍|推近|拉远|跟拍|环绕|剪辑|360|手持)/i.test(
          clause
        ) &&
        !/(?:指向镜头|直视镜头|看向镜头|面对镜头|镜头外|镜头前|镜头中|望向镜头)/.test(clause)
      ) {
        clauses.push(extractCameraPhrase(clause));
      }
    }
  }

  if (clauses.length) {
    return cleanExtractedPhrase([...new Set(clauses)].slice(0, 4).join("，"), 120);
  }

  return getKeywordSegment(descriptionSegments, ["镜头", "拍摄", "机位", "运镜"], 120);
}

function extractCameraPhrase(clause) {
  const match = String(clause || "").match(
    /((?:镜头|机位|快速剪辑|面部特写|手部动作|全身摇摆|侧身剪影|特写|中景|全景|近景|远景|广角|低角度|高角度|俯拍|仰拍|推近|拉远|跟拍|环绕|360|手持)[^，,。；;]*)/i
  );

  return match ? match[1].replace(/^[）)]+/, "").trim() : clause;
}

function getLightingDraftFromSegments(contentSegments, descriptionSegments) {
  const labeled = getLabeledSegment(contentSegments, /(?:光线|光影|色调|调色)[:：\]]\s*(.+)/i, 120);

  if (labeled) {
    return labeled;
  }

  const clauses = [];

  for (const segment of contentSegments) {
    for (const clause of splitClauses(segment)) {
      if (/(?:光线|光影|色调|调色|逆光|霓虹|阳光|月光|阴影|冷色|暖色|光晕|散景|灯|暗角)/.test(clause)) {
        clauses.push(clause);
      }
    }
  }

  if (clauses.length) {
    return cleanExtractedPhrase([...new Set(clauses)].slice(0, 3).join("，"), 120);
  }

  return getKeywordSegment(descriptionSegments, ["光线", "光影", "色调", "调色", "霓虹"], 100);
}

function getAudioDraftFromSegments(contentSegments, originalSegments, descriptionSegments) {
  const allSegments = [...contentSegments, ...originalSegments];
  const labeled =
    getLabeledSegment(allSegments, /(?:声音|音效|音频|BGM|音乐|对白)[:：\]]\s*(.+)/i, 120) ||
    getLabeledSegment(allSegments, /(?:声音|音效|音频|BGM|音乐|对白)(?:是|为)\s*(.+?)(?:[。；;]|$)/i, 120);

  if (labeled) {
    return labeled;
  }

  return (
    getKeywordSegment(allSegments, ["音效", "声音", "BGM", "音乐", "对白", "台词", "歌词", "低语", "环境音", "鼓点"], 120) ||
    getKeywordSegment(descriptionSegments, ["声音", "音效", "BGM", "音乐"], 100)
  );
}

function getDurationDraft(text, analysis) {
  if (analysis.tags.some((tag) => tag.key === "duration_15s" || tag.key === "timecoded_segments")) {
    return "15 秒";
  }

  const match = text.match(/(?:4|5|6|8|10|12|15)\s*(?:秒|s|seconds?)/i);
  return match ? normalizeSnippet(match[0], 16) : "15 秒";
}

function getRatioDraft(text) {
  const match = text.match(/\b(?:16:9|9:16|1:1|4:3|3:4)\b|横屏|竖屏|portrait|landscape/i);

  if (!match) {
    return "16:9 横屏";
  }

  const value = match[0].toLowerCase();

  if (value === "9:16" || value === "portrait" || value.includes("竖")) {
    return "9:16 竖屏";
  }

  if (value === "1:1") {
    return "1:1 方形";
  }

  return "16:9 横屏";
}

function getTemplateDraft(analysis) {
  const tagKeys = new Set(analysis.tags.map((tag) => tag.key));

  if (tagKeys.has("reference_image")) {
    return "image";
  }

  if (tagKeys.has("timecoded_segments")) {
    return "storyboard";
  }

  if (tagKeys.has("audio") || tagKeys.has("dialogue_lip_sync")) {
    return "audio";
  }

  if (analysis.structureLevel.key === "idea" || analysis.structureLevel.key === "short") {
    return "minimal";
  }

  return "standard";
}

function getBuilderDraftFromPrompt(prompt) {
  const analysis = getPromptAnalysis(prompt);
  const promptText = getDisplayPromptText(prompt);
  const combinedText = [prompt.title, prompt.description, promptText].filter(Boolean).join("\n");
  const contentSegments = splitPromptSegments(promptText);
  const originalSegments = splitPromptSegments(prompt.prompt || "");
  const descriptionSegments = splitPromptSegments(prompt.description || "");
  const genre = analysis.genres[0]?.key || "";

  return cleanBuilderDraft({
    template: getTemplateDraft(analysis),
    genre,
    ratio: getRatioDraft(combinedText),
    duration: getDurationDraft(combinedText, analysis),
    style:
      getStyleDraftFromSegments(contentSegments) ||
      getKeywordSegment(contentSegments, ["电影感", "超写实", "动漫", "VHS", "胶片", "纪录片", "赛博朋克", "奇幻"]) ||
      getKeywordSegment(descriptionSegments, ["风格", "电影感", "超写实", "动漫", "VHS", "胶片", "纪录片", "赛博朋克", "奇幻"]),
    subject: getSubjectDraftFromSegments(contentSegments, descriptionSegments) || normalizeSnippet(prompt.title, 72),
    scene: getSceneDraftFromSegments(contentSegments, descriptionSegments),
    action: getActionDraftFromSegments(contentSegments, descriptionSegments),
    camera: getCameraDraftFromSegments(contentSegments, descriptionSegments),
    lighting: getLightingDraftFromSegments(contentSegments, descriptionSegments),
    audio: getAudioDraftFromSegments(contentSegments, originalSegments, descriptionSegments),
    constraints:
      getKeywordSegment([...contentSegments, ...originalSegments], ["禁止", "无文字", "无字幕", "无水印", "保持一致", "全程保持"], 120) ||
      "保持主体身份一致；无文字、字幕、水印、Logo；避免脸部变形、肢体异常、服装漂移。"
  });
}

function openBuilderPanel() {
  elements.builderPanel.open = true;
}

function applyBuilderDraft(draft) {
  openBuilderPanel();
  elements.builderTemplate.value = draft.template;
  setSelectValue(elements.builderGenre, draft.genre);
  elements.builderRatio.value = draft.ratio;
  elements.builderDuration.value = draft.duration;
  elements.builderStyle.value = draft.style || elements.builderStyle.value;
  elements.builderSubject.value = draft.subject;
  elements.builderScene.value = draft.scene;
  elements.builderAction.value = draft.action;
  elements.builderCamera.value = draft.camera;
  elements.builderLighting.value = draft.lighting;
  elements.builderAudio.value = draft.audio;
  elements.builderConstraints.value = draft.constraints;
  updateBuilderOutput();
}

function fillBuilderFromPrompt(promptId) {
  const prompt = state.prompts.find((item) => String(item.id) === String(promptId));

  if (!prompt) {
    return;
  }

  applyBuilderDraft(getBuilderDraftFromPrompt(prompt));
}

function renderModalInsights(prompt) {
  const analysis = getPromptAnalysis(prompt);
  const scorePercent = Math.max(0, Math.min(100, (analysis.score.value / analysis.score.max) * 100));
  const genres = analysis.genres.length
    ? renderInlineChips(analysis.genres, "insight-chip", 4)
    : `<span class="insight-chip muted">未识别类型</span>`;
  const tags = analysis.tags.length
    ? renderInlineChips(analysis.tags, "insight-chip muted", 10)
    : `<span class="insight-chip muted">未识别模块</span>`;
  const inputModes = renderInlineChips(analysis.inputModes, "insight-chip strong", 4);

  elements.modalInsights.innerHTML = `
    <div class="insight-score">
      <div>
        <span class="score-label">结构评分</span>
        <strong>${escapeHtml(analysis.score.label)} ${analysis.score.value}/${analysis.score.max}</strong>
      </div>
      <div class="score-bar" aria-hidden="true"><span style="width: ${scorePercent}%"></span></div>
    </div>
    <div class="insight-groups">
      <div>
        <span class="score-label">结构</span>
        <div class="chip-row">
          <span class="insight-chip strong">${escapeHtml(analysis.structureLevel.label)}</span>
          <span class="insight-chip muted">${analysis.length} 字</span>
          ${
            analysis.timeSegmentCount
              ? `<span class="insight-chip muted">${analysis.timeSegmentCount} 段时间轴</span>`
              : ""
          }
        </div>
      </div>
      <div>
        <span class="score-label">输入</span>
        <div class="chip-row">${inputModes}</div>
      </div>
      <div>
        <span class="score-label">类型</span>
        <div class="chip-row">${genres}</div>
      </div>
      <div>
        <span class="score-label">模块</span>
        <div class="chip-row">${tags}</div>
      </div>
    </div>
  `;
}

function getRelatedPrompts(prompt, limit = 4) {
  const analysis = getPromptAnalysis(prompt);
  const genreKeys = new Set(analysis.genres.map((genre) => genre.key));
  const tagKeys = new Set(analysis.tags.map((tag) => tag.key));
  const levelKey = analysis.structureLevel.key;
  const length = analysis.length;

  return state.prompts
    .filter((candidate) => String(candidate.id) !== String(prompt.id))
    .map((candidate) => {
      const candidateAnalysis = getPromptAnalysis(candidate);
      const candidateGenreKeys = new Set(candidateAnalysis.genres.map((genre) => genre.key));
      const candidateTagKeys = new Set(candidateAnalysis.tags.map((tag) => tag.key));
      const sharedGenres = [...genreKeys].filter((key) => candidateGenreKeys.has(key)).length;
      const sharedTags = [...tagKeys].filter((key) => candidateTagKeys.has(key)).length;
      const lengthCloseness = Math.max(0, 1 - Math.abs(candidateAnalysis.length - length) / 1200);
      const score =
        sharedGenres * 5 +
        sharedTags * 1.2 +
        (candidateAnalysis.structureLevel.key === levelKey ? 2 : 0) +
        lengthCloseness +
        (candidate.featured ? 1 : 0);

      return { prompt: candidate, score, sharedGenres, sharedTags };
    })
    .filter((item) => item.score > 1.5)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.prompt);
}

function renderModalRelated(prompt) {
  const relatedPrompts = getRelatedPrompts(prompt);

  if (relatedPrompts.length === 0) {
    elements.modalRelated.innerHTML = "";
    return;
  }

  elements.modalRelated.innerHTML = `
    <div class="related-head">
      <span class="score-label">相似提示词</span>
    </div>
    <div class="related-list">
      ${relatedPrompts
        .map((related) => {
          const analysis = getPromptAnalysis(related);
          const genre = analysis.genres[0]?.label || analysis.structureLevel.shortLabel;

          return `
            <button class="related-item" type="button" data-id="${escapeHtml(String(related.id))}">
              <span>${escapeHtml(related.title || "Untitled")}</span>
              <small>${escapeHtml(genre || "未分类")} · ${escapeHtml(analysis.score.label)} ${analysis.score.value}/${analysis.score.max}</small>
            </button>
          `;
        })
        .join("")}
    </div>
  `;

  elements.modalRelated.querySelectorAll(".related-item").forEach((button) => {
    button.addEventListener("click", () => openModal(button.dataset.id));
  });
}

async function writeClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back for browsers that expose Clipboard API but block it in this context.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showCopiedState(button) {
  if (!button) {
    return;
  }

  const originalText = button.dataset.label || button.textContent || "复制";
  button.dataset.label = originalText;
  button.textContent = "已复制";
  button.classList.add("copied");
  window.clearTimeout(button.copyResetTimer);
  button.copyResetTimer = window.setTimeout(() => {
    button.textContent = originalText;
    button.classList.remove("copied");
  }, 1200);
}

async function copyPromptText(promptText, button) {
  await writeClipboardText(promptText || "");
  showCopiedState(button);
}

function ensurePreviewVideoLoaded(video) {
  if (!video || video.src || !video.dataset.src) {
    return;
  }

  video.src = video.dataset.src;
  video.load();
}

function playPreviewVideo(video) {
  if (!video) {
    return;
  }

  ensurePreviewVideoLoaded(video);
  video
    .play()
    .then(() => {
      video.classList.add("playing");
    })
    .catch(() => {});
}

function pausePreviewVideo(video) {
  if (!video) {
    return;
  }

  video.pause();
  video.classList.remove("playing");
}

function pauseAllPreviewVideos() {
  elements.cards.querySelectorAll(".thumb-video").forEach((video) => {
    pausePreviewVideo(video);
  });
}

function applyFilters() {
  const normalizedQuery = state.query.trim().toLowerCase();

  state.filtered = state.prompts.filter((prompt) => {
    if (state.featuredOnly && !prompt.featured) {
      return false;
    }

    if (state.genreFilter && !hasPromptGenre(prompt, state.genreFilter)) {
      return false;
    }

    if (state.levelFilter && getPromptLevel(prompt) !== state.levelFilter) {
      return false;
    }

    if (state.tagFilter && !hasPromptTag(prompt, state.tagFilter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return getSearchText(prompt).includes(normalizedQuery);
  });

  renderCards();
}

function renderCards() {
  elements.resultsCount.textContent = `当前结果 ${state.filtered.length} / ${state.prompts.length}`;
  elements.cards.innerHTML = "";

  if (state.filtered.length === 0) {
    elements.empty.classList.remove("hidden");
    return;
  }

  elements.empty.classList.add("hidden");

  const fragment = document.createDocumentFragment();

  for (const prompt of state.filtered) {
    const previewVideoUrl = getReferenceVideoUrl(prompt);
    const promptText = getDisplayPromptText(prompt);
    const article = document.createElement("article");
    article.className = "prompt-card";
    article.innerHTML = `
      <button class="card-button" type="button" data-id="${prompt.id}">
        <div class="thumb-shell">
          ${
            previewVideoUrl
              ? `<video class="thumb thumb-video" muted loop playsinline preload="none" poster="${escapeHtml(
                  prompt.thumbnailUrl || ""
                )}" data-src="${escapeHtml(previewVideoUrl)}" aria-label="${escapeHtml(prompt.title)} 视频预览"></video>`
              : prompt.thumbnailUrl
                ? `<img class="thumb" src="${escapeHtml(prompt.thumbnailUrl)}" alt="${escapeHtml(prompt.title)}" />`
                : `<div class="thumb placeholder"></div>`
          }
          ${
            previewVideoUrl && prompt.thumbnailUrl
              ? `<img class="thumb thumb-poster" src="${escapeHtml(prompt.thumbnailUrl)}" alt="" loading="lazy" />`
              : ""
          }
          ${prompt.featured ? `<span class="card-badge">FEATURED</span>` : ""}
          ${previewVideoUrl ? `<span class="media-flag">PREVIEW</span>` : ""}
        </div>
        <div class="card-body">
          <p class="card-meta">${escapeHtml(prompt.authorName || "Unknown")} · ${escapeHtml(
      formatDate(prompt.sourcePublishedAt)
    )}</p>
          ${getCardInsightHtml(prompt)}
          <h3>${escapeHtml(prompt.title)}</h3>
          <p>${escapeHtml(prompt.description || "No description.")}</p>
        </div>
      </button>
      <div class="card-actions">
        <button class="builder-inline-button" type="button" data-id="${prompt.id}">带入 Builder</button>
      </div>
      ${
        promptText
          ? `<div class="card-prompt-wrap">
              <pre class="card-prompt">${escapeHtml(promptText)}</pre>
              <button class="copy-hover card-copy" type="button" data-id="${prompt.id}" aria-label="复制提示词">复制</button>
            </div>`
          : ""
      }
    `;

    const cardButton = article.querySelector(".card-button");
    const previewVideo = article.querySelector(".thumb-video");
    const copyButton = article.querySelector(".card-copy");
    const builderButton = article.querySelector(".builder-inline-button");

    cardButton.addEventListener("click", () => openModal(prompt.id));

    builderButton.addEventListener("click", (event) => {
      event.stopPropagation();
      fillBuilderFromPrompt(prompt.id);
    });

    if (previewVideo) {
      cardButton.addEventListener("mouseenter", () => playPreviewVideo(previewVideo));
      cardButton.addEventListener("mouseleave", () => pausePreviewVideo(previewVideo));
      cardButton.addEventListener("focus", () => playPreviewVideo(previewVideo));
      cardButton.addEventListener("blur", () => pausePreviewVideo(previewVideo));
    }

    if (copyButton) {
      copyButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        await copyPromptText(promptText, copyButton);
      });
    }

    fragment.appendChild(article);
  }

  elements.cards.appendChild(fragment);
}

function syncModalTabs() {
  const translatedActive = state.modalPromptMode === "translated";
  elements.tabTranslated.classList.toggle("active", translatedActive);
  elements.tabOriginal.classList.toggle("active", !translatedActive);
}

function updateModalPrompt() {
  if (!state.activePrompt) {
    return;
  }

  elements.modalPrompt.textContent = getActivePromptText();
  syncModalTabs();
}

function applyMediaAspect(shell, width, height) {
  if (!shell || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return;
  }

  const ratio = width / height;
  shell.style.setProperty("--media-aspect-ratio", `${width} / ${height}`);
  shell.classList.toggle("is-portrait", ratio < 0.85);
  shell.classList.toggle("is-square", ratio >= 0.85 && ratio <= 1.15);
}

function renderModalMedia(prompt) {
  elements.modalMedia.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "modal-media-shell";
  const referenceVideoUrl = getReferenceVideoUrl(prompt);

  if (referenceVideoUrl) {
    const video = document.createElement("video");
    video.className = "modal-player";
    video.src = referenceVideoUrl;
    video.controls = true;
    video.playsInline = true;
    video.preload = "metadata";

    if (prompt.thumbnailUrl) {
      video.poster = prompt.thumbnailUrl;
    }

    video.addEventListener("loadedmetadata", () => {
      applyMediaAspect(shell, video.videoWidth, video.videoHeight);
    });

    shell.appendChild(video);

    const overlay = document.createElement("div");
    overlay.className = "media-overlay compact";
    overlay.innerHTML = `
      <span class="media-chip">R2 Mirror</span>
      <a class="media-overlay-link" href="${escapeHtml(referenceVideoUrl)}" target="_blank" rel="noreferrer">在新页打开</a>
    `;
    shell.appendChild(overlay);
  } else if (prompt.thumbnailUrl) {
    const image = document.createElement("img");
    image.src = prompt.thumbnailUrl;
    image.alt = prompt.title || "";
    image.addEventListener("load", () => {
      applyMediaAspect(shell, image.naturalWidth, image.naturalHeight);
    });
    shell.appendChild(image);

    const overlay = document.createElement("div");
    overlay.className = "media-overlay";
    overlay.innerHTML = `
      <span class="media-chip">Mirror unavailable</span>
      <p class="media-note">这条参考视频的源文件已失效，暂时没有可用的自有镜像。</p>
    `;
    shell.appendChild(overlay);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "modal-placeholder";
    placeholder.textContent = "No preview";
    shell.appendChild(placeholder);
  }

  elements.modalMedia.appendChild(shell);
}

function openModal(promptId) {
  const prompt = state.prompts.find((item) => String(item.id) === String(promptId));

  if (!prompt) {
    return;
  }

  pauseAllPreviewVideos();

  state.activePrompt = prompt;
  state.modalPromptMode = prompt.translatedPrompt ? "translated" : "original";

  renderModalMedia(prompt);
  elements.modalTitle.textContent = prompt.title || "";
  elements.modalDescription.textContent = prompt.description || "";
  renderModalInsights(prompt);
  elements.modalLanguage.textContent = prompt.language || "unknown";
  elements.modalDate.textContent = formatDate(prompt.sourcePublishedAt);
  elements.modalVideo.href = getReferenceVideoUrl(prompt) || "#";
  elements.modalVideo.textContent = "R2 镜像视频";
  elements.modalVideo.classList.toggle("hidden", !getReferenceVideoUrl(prompt));
  elements.modalSource.href = prompt.sourceLink || "#";
  elements.modalDetail.href = prompt.detailUrl || "#";
  elements.modalBadge.classList.toggle("hidden", !prompt.featured);
  updateModalPrompt();
  renderModalRelated(prompt);

  if (!elements.modal.open) {
    elements.modal.showModal();
  }
}

function closeModal() {
  const video = elements.modalMedia.querySelector("video");

  if (video) {
    video.pause();
  }

  elements.modal.close();
  elements.modalMedia.innerHTML = "";
  elements.modalRelated.innerHTML = "";
  state.activePrompt = null;
}

async function copyCurrentPrompt() {
  await copyPromptText(getActivePromptText(), elements.copyPrompt);
}

async function copyCurrentTemplate() {
  if (!state.activePrompt) {
    return;
  }

  await copyPromptText(buildStructureTemplate(state.activePrompt), elements.copyTemplate);
}

async function copyBuilderPrompt() {
  await copyPromptText(elements.builderOutput.textContent || "", elements.copyBuilder);
}

async function copyRemixPrompt() {
  if (!state.lastRemixPrompt) {
    await generateBuilderRemix();
  }

  await copyPromptText(state.lastRemixPrompt || "", elements.copyRemix);
}

function useActivePromptInBuilder() {
  if (!state.activePrompt) {
    return;
  }

  fillBuilderFromPrompt(state.activePrompt.id);
  closeModal();
}

function setSelectValue(select, value) {
  const hasValue = value && [...select.options].some((option) => option.value === value);
  select.value = hasValue ? value : "";
  return select.value;
}

function applyBuilderToArchiveFilters() {
  const templateTag = getBuilderTemplateTag(elements.builderTemplate.value);
  const genreKey = elements.builderGenre.value;

  state.query = "";
  state.featuredOnly = false;
  state.genreFilter = setSelectValue(elements.genreFilter, genreKey);
  state.levelFilter = "";
  state.tagFilter = setSelectValue(elements.tagFilter, templateTag);

  elements.search.value = "";
  elements.levelFilter.value = "";
  elements.toggleFeatured.classList.remove("active");

  applyFilters();
  document.querySelector(".results-head")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindEvents() {
  elements.search.addEventListener("input", (event) => {
    state.query = event.target.value;
    applyFilters();
  });

  elements.clear.addEventListener("click", () => {
    state.query = "";
    state.genreFilter = "";
    state.levelFilter = "";
    state.tagFilter = "";
    elements.search.value = "";
    elements.genreFilter.value = "";
    elements.levelFilter.value = "";
    elements.tagFilter.value = "";
    applyFilters();
  });

  elements.toggleFeatured.addEventListener("click", () => {
    state.featuredOnly = !state.featuredOnly;
    elements.toggleFeatured.classList.toggle("active", state.featuredOnly);
    applyFilters();
  });

  elements.genreFilter.addEventListener("change", (event) => {
    state.genreFilter = event.target.value;
    applyFilters();
  });

  elements.levelFilter.addEventListener("change", (event) => {
    state.levelFilter = event.target.value;
    applyFilters();
  });

  elements.tagFilter.addEventListener("change", (event) => {
    state.tagFilter = event.target.value;
    applyFilters();
  });

  elements.tabTranslated.addEventListener("click", () => {
    state.modalPromptMode = "translated";
    updateModalPrompt();
  });

  elements.tabOriginal.addEventListener("click", () => {
    state.modalPromptMode = "original";
    updateModalPrompt();
  });

  elements.closeModal.addEventListener("click", closeModal);
  elements.modal.addEventListener("click", (event) => {
    if (event.target === elements.modal) {
      closeModal();
    }
  });
  elements.copyPrompt.addEventListener("click", copyCurrentPrompt);
  elements.copyTemplate.addEventListener("click", copyCurrentTemplate);
  elements.useBuilder.addEventListener("click", useActivePromptInBuilder);
  elements.copyBuilder.addEventListener("click", copyBuilderPrompt);
  elements.copyRemix.addEventListener("click", copyRemixPrompt);
  elements.filterBuilder.addEventListener("click", applyBuilderToArchiveFilters);
  elements.remixBuilder.addEventListener("click", generateBuilderRemix);
  elements.resetBuilder.addEventListener("click", resetBuilder);
  elements.useRemix.addEventListener("click", useRemixInBuilder);

  [
    elements.builderTemplate,
    elements.builderGenre,
    elements.builderRatio,
    elements.builderDuration,
    elements.builderStyle,
    elements.builderSubject,
    elements.builderScene,
    elements.builderAction,
    elements.builderCamera,
    elements.builderLighting,
    elements.builderAudio,
    elements.builderConstraints
  ].forEach((element) => {
    element.addEventListener("input", updateBuilderOutput);
    element.addEventListener("change", updateBuilderOutput);
  });
}

async function loadData() {
  const log = (...a) => {
    try {
      console.log("[HUB]", ...a);
    } catch (e) {}
  };
  try {
    const ym = window.__YM__ || {};
    const slug = ym.slug;
    const dataBase = (ym.dataOrigin || "").replace(/\/+$/, "");
    log("start", { slug, dataBase });
    const response = await fetch(`${dataBase}/data/${slug}.json`);
    log("fetched", response.status, response.headers.get("content-type"));
    if (!response.ok) {
      throw new Error(`Failed to load prompt data: ${response.status}`);
    }
    const payload = await response.json();
    log("parsed", payload.total, payload.prompts && payload.prompts.length);
    const prompts = payload.prompts.slice().sort((left, right) => {
      if (left.featured !== right.featured) {
        return left.featured ? -1 : 1;
      }

      return new Date(right.sourcePublishedAt).getTime() - new Date(left.sourcePublishedAt).getTime();
    });

    state.prompts = prompts;
    state.filtered = prompts;
    log("populateFilters:start", prompts.length);
    populateFilters(prompts);
    log("populateFilters:done");
    updateBuilderOutput();
    log("updateBuilderOutput:done");

    elements.total.textContent = String(payload.total);
    elements.featured.textContent = String(prompts.filter((item) => item.featured).length);
    elements.sync.textContent = formatDate(payload.generatedAt);
    elements.source.textContent = payload.dataSourceLabel || payload.dataSource || "Unknown";

    log("applyFilters:start");
    applyFilters();
    log("applyFilters:done");
  } catch (error) {
    console.error("[HUB] loadData FAILED", (error && error.stack) || error);
    throw error;
  }
}

console.log("[HUB] module init");
bindEvents();
loadData().catch((error) => {
  elements.resultsCount.textContent = "数据加载失败";
  elements.empty.classList.remove("hidden");
  elements.empty.innerHTML = `<h3>数据加载失败</h3><p>${escapeHtml(error.message)}</p>`;
});
