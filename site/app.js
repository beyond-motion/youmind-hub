// youmind-hub shell router.
// - Derives the site base from THIS module's URL, so it works both at a domain
//   root (Cloudflare, canonical) and under a /<repo>/ subpath (GitHub Pages mirror).
// - Large prompt data is fetched from site.dataOrigin (an R2 Worker) with CORS;
//   falls back to same-origin when dataOrigin is empty (local dev).
// - Phase 3 will port the rich UX (filters/builder/insights) from Seedance app.js.

const BASE = new URL(".", import.meta.url).href; // directory containing app.js = site root
const basePath = new URL(BASE).pathname;

function currentSlug() {
  let rest = location.pathname;
  if (basePath !== "/" && rest.startsWith(basePath)) {
    rest = rest.slice(basePath.length);
  }
  const segment = rest.split("/").filter(Boolean)[0] || "";
  return segment === "index.html" ? "" : segment;
}

const slug = currentSlug();
const $ = (selector) => document.querySelector(selector);

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} -> ${response.status}`);
  }
  return response.json();
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function buildNav(registry) {
  const nav = $("#nav-links");
  if (!nav) return;
  nav.innerHTML = "";
  const home = el("a", "", "首页");
  home.href = BASE;
  nav.appendChild(home);
  for (const source of registry.sources) {
    if (source.enabled === false) continue;
    const link = el("a", "", source.title);
    link.href = `${BASE}${source.slug}/`;
    nav.appendChild(link);
  }
}

function renderLanding(registry) {
  document.title = registry.site?.title || "YouMind Prompt Archive";
  buildNav(registry);
  const main = $("#main");
  main.innerHTML = "";
  const hero = el("section", "hero");
  hero.appendChild(el("h1", null, registry.site?.title || "YouMind Prompt Archive"));
  hero.appendChild(el("p", "lede", registry.site?.description || ""));
  const grid = el("div", "lib-grid");
  for (const source of registry.sources) {
    if (source.enabled === false) continue;
    const card = el("a", "lib-card");
    card.href = `${BASE}${source.slug}/`;
    card.appendChild(el("h2", null, source.title));
    card.appendChild(el("p", null, `<strong>${source.count}</strong> 条 · ${source.kind}`));
    card.appendChild(el("small", null, source.lastSync ? `更新于 ${new Date(source.lastSync).toLocaleString()}` : ""));
    grid.appendChild(card);
  }
  hero.appendChild(grid);
  main.appendChild(hero);
}

function renderGallery(registry, meta, data) {
  document.title = `${meta?.title || slug} · ${registry.site?.title || "YouMind Prompt Archive"}`;
  buildNav(registry);
  const main = $("#main");
  main.innerHTML = "";

  const head = el("section", "gallery-head");
  head.appendChild(el("h1", null, meta?.title || slug));
  head.appendChild(el("p", "lede", meta?.branding?.headline || ""));
  head.appendChild(
    el(
      "p",
      "stats",
      `共 ${data.total} 条 · 数据源:${data.dataSourceLabel || "-"} · 生成于 ${new Date(data.generatedAt).toLocaleString()}`
    )
  );
  const search = el("input", "search");
  search.placeholder = "搜索标题 / 描述 / 提示词";
  head.appendChild(search);
  const grid = el("div", "card-grid");
  head.appendChild(grid);
  main.appendChild(head);

  const prompts = data.prompts || [];

  function draw(query) {
    grid.innerHTML = "";
    const needle = (query || "").toLowerCase();
    const list = prompts.filter((prompt) => {
      if (!needle) return true;
      return [prompt.title, prompt.description, prompt.prompt, prompt.translatedPrompt].some((field) =>
        String(field || "").toLowerCase().includes(needle)
      );
    });
    for (const prompt of list.slice(0, 300)) {
      const card = el("article", "card");
      card.appendChild(el("h3", null, prompt.title || "(无标题)"));
      card.appendChild(el("p", null, String(prompt.description || "").slice(0, 120)));
      if (prompt.thumbnailUrl) {
        const img = el("img");
        img.src = prompt.thumbnailUrl;
        img.loading = "lazy";
        card.appendChild(img);
      }
      card.addEventListener("click", () => showModal(prompt));
      grid.appendChild(card);
    }
    if (list.length === 0) {
      grid.appendChild(el("p", "empty", "没有匹配结果"));
    }
  }

  search.addEventListener("input", () => draw(search.value));
  draw("");
}

function showModal(prompt) {
  const modal = $("#modal");
  modal.innerHTML = "";
  const box = el("div", "modal-box");
  const close = el("button", "modal-close", "×");
  close.addEventListener("click", () => modal.classList.add("hidden"));
  box.appendChild(close);
  box.appendChild(el("h3", null, prompt.title || ""));
  box.appendChild(el("p", null, prompt.description || ""));
  box.appendChild(el("pre", null, prompt.prompt || prompt.translatedPrompt || ""));
  const videoUrl = prompt.playbackUrl || prompt.videoUrl;
  if (videoUrl) {
    const video = el("video");
    video.src = videoUrl;
    video.controls = true;
    box.appendChild(video);
  }
  if (prompt.detailUrl) {
    const link = el("a", "btn", "查看来源");
    link.href = prompt.detailUrl;
    link.target = "_blank";
    link.rel = "noreferrer";
    box.appendChild(link);
  }
  modal.appendChild(box);
  modal.classList.remove("hidden");
}

(async () => {
  try {
    const registry = await loadJson(`${BASE}registry.json`);
    if (slug && registry.sources.some((source) => source.slug === slug)) {
      const meta = registry.sources.find((source) => source.slug === slug);
      const dataOrigin = (registry.site?.dataOrigin || "").replace(/\/+$/, "");
      const dataBase = dataOrigin || BASE;
      const data = await loadJson(`${dataBase}/data/${slug}.json`);
      renderGallery(registry, meta, data);
    } else {
      renderLanding(registry);
    }
  } catch (error) {
    $("#main").innerHTML = `<p class="error">加载失败:${error.message}</p>`;
  }
})();
