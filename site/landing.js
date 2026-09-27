// youmind-hub landing: list all libraries from registry.json.
// Derives the site base from THIS module's URL so it works at a domain root
// (Cloudflare canonical) and under a /<repo>/ subpath (GitHub Pages mirror).
const BASE = new URL(".", import.meta.url).href;

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
    const nav = document.getElementById("lib-nav");
    const grid = document.getElementById("lib-grid");
    const count = document.getElementById("lib-count");

    const totalPrompts = enabled.reduce((sum, source) => sum + source.count, 0);
    count.textContent = `${enabled.length} 个库 · ${totalPrompts.toLocaleString()} 条提示词`;

    const home = el("a", "chip", "首页");
    home.href = BASE;
    nav.appendChild(home);

    for (const source of enabled) {
      const navLink = el("a", "chip", source.title);
      navLink.href = `${BASE}${source.slug}/`;
      nav.appendChild(navLink);

      const card = el("a", "prompt-card");
      card.href = `${BASE}${source.slug}/`;
      const body = el("div", "card-body");
      body.appendChild(el("p", "card-meta", `${source.kind} · ${source.count.toLocaleString()} 条`));
      body.appendChild(el("h3", null, source.title));
      const lede = el("p", null, source.branding?.headline || "");
      body.appendChild(lede);
      card.appendChild(body);
      grid.appendChild(card);
    }
  } catch (error) {
    document.getElementById("lib-grid").innerHTML =
      `<section class="empty-state"><h3>加载失败</h3><p>${error.message}</p></section>`;
  }
})();
