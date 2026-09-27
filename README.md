# youmind-hub

统一归档 YouMind 各模型的公开提示词:一个网站、按模型分子页面,底层每库独立抓取/同步/构建。每日由 GitHub Actions 自动抓取增量并部署。

独立整理,与 YouMind 无隶属/背书关系。代码 MIT;提示词内容来源为 YouMind / YouMind-OpenLab(CC BY 4.0)。

## 结构

```
packages/core/lib/   # 参数化核心库(抓取/分析/建站/飞书),按 sources/<slug>/config.json 驱动
sources/<slug>/config.json   # 每个模型一份配置(新增模型=加一份,零改核心)
sources/<slug>/.local.json   # 该库飞书 base/table(gitignore,本地/CI 运行时注入)
scripts/
  fetch.mjs           # 抓取(--all 或 --source <slug>)
  fetch-prompts.mjs   # 单源抓取(YOUMIND_SOURCE)
  build-site.mjs      # 本地全量构建(每源 build-one + assemble)
  build-one.mjs       # 单源 → dist/data/<slug>.json
  assemble-site.mjs   # 汇总 dist/data/* → registry + 落地页 + /<slug>/ 子页
  list-sources.mjs    # 输出启用源 slug 数组(CI matrix 用)
  sync-feishu-api.mjs # 单源增量同步飞书多维表格
site/                 # 共享外壳(index.html/app.js/styles.css)
data/<slug>/          # 每源快照(gitignore,CI 抓取生成)
dist/                 # 构建产物(gitignore)
```

## 本地命令

```bash
npm run fetch                # 抓取所有启用源 → data/<slug>/prompts.zh-CN.json
npm run build:site           # 聚合所有源 → dist/(落地页 + /<slug>/ + data/)
npm run serve                # 本地预览 http://localhost:4173
YOUMIND_SOURCE=seedance-2-5 node scripts/fetch-prompts.mjs   # 只抓一个
```

## 新增一个模型

1. `sources/<slug>/config.json`(见下),填 `api.model` / `api.endpoint`(`prompts` 图像 / `video-prompts` 视频)/ `api.gallerySlug`。
2. (可选)`sources/<slug>/.local.json` 填飞书 `{baseToken, tableId}`。
3. `npm run fetch && npm run build:site`。CI 的 matrix 会自动发现(无需改 workflow)。

> ⚠️ `api.gallerySlug`(URL/详情链接用)与 `api.model`(请求体用)**可能不同**。例如 Opus 5.5:URL 是 `opus-5-5-prompts`,但 API model 是 `claude-opus-5-5`。发现真实 model slug 的正确做法:抓画廊页读内联 `modelSlug`,不要猜。

config 示例:

```json
{
  "slug": "opus-5-5", "title": "Opus 5.5", "enabled": true, "order": 12, "kind": "video",
  "api": { "model": "claude-opus-5-5", "endpoint": "video-prompts", "gallerySlug": "opus-5-5-prompts", "locale": "zh-CN" },
  "feishu": { "baseToken": "", "tableId": "" },
  "branding": { "headline": "…", "sourceRepo": "YouMind-OpenLab/…", "builderTemplates": ["standard","minimal"] }
}
```

## 部署(需凭证,见计划 Task 7)

- **域名**:主域 `youmind.beyondmotion.net`,每库子路径 `/<slug>/`。
- **双发**:Cloudflare Pages(项目 `youmind-hub`,自定义域,canonical)+ GitHub Pages(同路径镜像)。旧库域名 301 到对应子路径。
- **Secrets**(仓库级):`FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`CLOUDFLARE_API_TOKEN`、`FEISHU_TABLES_JSON`。
  `FEISHU_TABLES_JSON` 形如 `{"seedance-2-0":{"baseToken":"…","tableId":"…"},"nano-banana-pro":{…}}`,workflow 会在同步前写回各源 `.local.json`(故 base/table 不进 git)。

## 许可

- 本仓库自有代码:MIT。
- 引用/改编的 YouMind OpenLab 提示词内容:CC BY 4.0,需标注来源、链接许可、明示改动,不得暗示 YouMind 认可。
