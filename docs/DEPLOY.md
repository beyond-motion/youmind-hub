# youmind-hub 部署与运维手册

一个配置驱动的静态归档站:把 YouMind 各模型的公开提示词整理成 **一个网站、按模型分子页面**,每日由 GitHub Actions 自动抓取增量并部署。代码 MIT;内容归 YouMind / YouMind-OpenLab(CC BY 4.0),本站仅索引与归属。

## 1. 线上入口

| 用途 | 地址 |
|---|---|
| **规范站(自定义域,canonical)** | https://youmind.beyondmotion.net |
| Cloudflare Pages 默认域 | https://youmind-hub.pages.dev |
| GitHub Pages 镜像(同路径) | https://beyond-motion.github.io/youmind-hub/ |
| 数据 Worker(R2 网关,`/data/<slug>.json`) | https://youmind-hub-data-gate.violinpearson.workers.dev |
| 旧域 301 | `seedance.beyondmotion.net` → `/seedance-2-0/`;`gptimage.beyondmotion.net` → `/gpt-image-2/` |

所有页面都带 `<link rel="canonical" href="https://youmind.beyondmotion.net/...">`,GitHub Pages 镜像因此把权重合并到规范域,不分散 SEO。

## 2. 架构

```
每日 cron (0 18 * * * UTC ≈ 北京 02:00) + push(脚本/站点/源/worker 变更)
        │
discover ── 读 sources/*/config.json 得出启用源列表(新增模型=加一份 config,无需改 workflow)
        │
fetch-sync (matrix, fail-fast:false,每源独立 job)
   fetch → 哈希门控 → 同步飞书(软失败)→ build-one → 上传 artifact site-data-<slug>
        │
build-deploy (needs: fetch-sync, if: always())
   flatten artifacts → restore-lastgood(缺的从 R2 兜底)→ assemble(质量门 + 每源品牌化子页 + 落地页)
   → 上传 dist/data/*.json 到 R2 → 部署 data-gate Worker → 剥离 data → 部署 CF Pages + GitHub Pages
```

- **Pages 只放外壳**(落地页 + `/<slug>/` 子页 + registry.json),规避 25MiB/文件上限。
- **大数据走 R2**:每个 `data/<slug>.json`(最大 ~82MB 的 GPT Image 2)由 `youmind-hub-data-gate` Worker 从 R2 读出并带 CORS;前端从 `registry.site.dataOrigin` 指向的 Worker 取数,规范站与镜像站都能用。
- **底层每库独立**:独立 `data/<slug>/` 快照、独立飞书表、独立 CI matrix 项、独立 R2 前缀;一个源失败不影响其他源与整站(质量门只在"全军覆没"时才算失败)。

## 3. Cloudflare 资源(账号 Violinpearson,Account ID `9661200cdc9a2f99e09ae8ffc09f653f`)

- R2 bucket:`youmind-hub-data`
- Worker:`youmind-hub-data-gate`(`workers/data-gate`)—— serve `/data/<slug>.json`
- Worker:`youmind-old-redirect`(`workers/old-redirect`)—— 旧域 301
- Pages 项目:`youmind-hub`,自定义域 `youmind.beyondmotion.net`

## 4. GitHub

- 仓库:`beyond-motion/youmind-hub`(public),Pages 已启用(build_type = workflow)
- Workflow:`.github/workflows/sync-and-deploy.yml`
- Secrets(仓库级):`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_TABLES_JSON`(可选,缺省则跳过飞书同步,站点仍从公开 API 构建)

`FEISHU_TABLES_JSON` 形如:
```json
{ "seedance-2-0": {"baseToken":"...","tableId":"..."}, "nano-banana-pro": {"baseToken":"...","tableId":"..."} }
```
workflow 同步前把它写回各源 `.local.json`,故 base/table 不进 git。

## 5. 本地命令

```bash
npm ci
npm run fetch            # 抓取所有启用源 → data/<slug>/prompts.zh-CN.json
npm run build:site       # 聚合 → dist/(落地页 + /<slug>/ + data/)
PORT=8817 npm run serve  # 本地预览(默认 8817,PORT 可覆盖)
YOUMIND_SOURCE=seedance-2-5 node scripts/fetch-prompts.mjs   # 只抓一个
```

## 6. 新增一个模型

1. `sources/<slug>/config.json`(见 README 示例):填 `api.model` / `api.endpoint`(`prompts` 图像 / `video-prompts` 视频)/ `api.gallerySlug` / `branding`。
2. (可选)`sources/<slug>/.local.json` 填飞书 `{baseToken, tableId}`。
3. `npm run fetch && npm run build:site` 自检;commit + push。CI 的 matrix 会自动发现,无需改 workflow。

> ⚠️ `api.gallerySlug`(URL/详情链接)与 `api.model`(请求体)可能不同。发现真实 slug:抓画廊页读内联 `modelSlug`,不要猜。例:Opus 5.5 URL=`opus-5-5-prompts`,API model=`claude-opus-5-5`。

## 7. 手动部署(改基础设施时)

```bash
# 一次性 / 结构变更时:
npx wrangler r2 bucket create youmind-hub-data                 # R2 桶(已存在则跳过)
npx wrangler deploy --config workers/data-gate/wrangler.toml   # 数据网关 Worker
npx wrangler pages project create youmind-hub --production-branch main
npx wrangler deploy --config workers/old-redirect/wrangler.toml # 旧域 301 Worker(含路由)
# 自定义域:CF Dashboard → Workers & Pages → youmind-hub → Custom domains → youmind.beyondmotion.net
```
日常抓取/建站/部署由 CI 自动完成,无需手动。

## 8. 排错

- **定时没跑**:GitHub schedule 常晚 30~70 分钟;超 2 小时看 Actions 是否被自动停用(长期不活跃会),进页面 Enable。
- **某库从首页消失**:该源本次抓取/构建失败 → `restore-lastgood` 从 R2 取上一次成功数据兜底;若 R2 也没有则暂时隐藏(质量门保证不会部署空站)。看对应 matrix job 日志。
- **CF Pages 部署失败**:确认 `youmind-hub` Pages 项目已建(见 §7);`wrangler pages deploy` 不会自动建项目。
- **GitHub Pages 失败**:仓库需启用 Pages(build_type=workflow);workflow 的 `Setup Pages` 用 `enablement:true`。
- **数据 404**:data-gate Worker 是否部署、R2 是否有对象、`registry.site.dataOrigin` 是否指向 Worker。
- **深色模式下样式发灰**:CSS 已 `color-scheme: light`;若自定义域换了,记得同步 `registry.json` 的 `site.canonical` 与 `site.dataOrigin`。
- **Node 20 弃用警告 / cache save failed**:cosmetic / 非致命,不影响部署。
