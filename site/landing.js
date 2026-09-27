// youmind-hub landing: group libraries by category (Video / Image / Code).
// Derives the site base from THIS module's URL so it works at a domain root
// (Cloudflare canonical) and under a /<repo>/ subpath (GitHub Pages mirror).
const BASE = new URL(".", import.meta.url).href;

const CATEGORY_META = {
  video: { label: "影片", en: "Video" },
  image: { label: "图像", en: "Image" },
  code: { label: "编程", en: "Code" }
};
const CATEGORY_ORDER = ["video", "image", "code"];

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> ${response.status}`);
  return response.json();
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

(async () => {
  try {
    const registry = await loadJson(`${BASE}registry.json`);
    document.title = registry.site?.title || "YouMind Prompt Archive";

    const enabled = registry.sources.filter((source) => source.enabled !== false);
    const totalPrompts = enabled.reduce((sum, source) => sum + source.count, 0);

    // quick-jump nav chips (flat list of every library)
    const nav = document.getElementById("lib-nav");
    const home = el("a", "chip", "首页");
    home.href = BASE;
    nav.appendChild(home);
    for (const source of enabled) {
      const link = el("a", "chip", source.title);
      link.href = `${BASE}${source.slug}/`;
      nav.appendChild(link);
    }

    // group by category
    const groups = {};
    for (const source of enabled) {
      const category = source.category || "image";
      (groups[category] = groups[category] || []).push(source);
    }
    for (const category of Object.keys(groups)) {
      groups[category].sort((left, right) => left.order - right.order);
    }

    const container = document.getElementById("lib-sections");
    container.innerHTML = "";

    for (const category of CATEGORY_ORDER) {
      const list = groups[category];
      if (!list || list.length === 0) continue;
      const meta = CATEGORY_META[category] || { label: category, en: category };
      const sectionPrompts = list.reduce((sum, source) => sum + source.count, 0);

      const section = el("section", "lib-section");
      const head = el("div", "results-head");
      head.appendChild(
        el("div", null, `<p class="section-kicker">${meta.en}</p><h2>${meta.label}</h2>`)
      );
      head.appendChild(
        el("p", "results-count", `${list.length} 个库 · ${sectionPrompts.toLocaleString()} 条`)
      );
      section.appendChild(head);

      const grid = el("div", "lib-grid");
      for (const source of list) {
        const card = el("a", "prompt-card");
        card.href = `${BASE}${source.slug}/`;
        const body = el("div", "card-body");
        body.appendChild(el("p", "card-meta", `${source.count.toLocaleString()} 条`));
        body.appendChild(el("h3", null, source.title));
        body.appendChild(el("p", null, source.branding?.headline || ""));
        card.appendChild(body);
        grid.appendChild(card);
      }
      section.appendChild(grid);
      container.appendChild(section);
    }

    // total summary line
    const summary = el("p", "results-count");
    summary.style.margin = "0 0 18px";
    summary.textContent = `共 ${enabled.length} 个库 · ${totalPrompts.toLocaleString()} 条提示词`;
    container.prepend(summary);
  } catch (error) {
    document.getElementById("lib-sections").innerHTML =
      `<section class="empty-state"><h3>加载失败</h3><p>${error.message}</p></section>`;
  }
})();
