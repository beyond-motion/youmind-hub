# youmind-hub Gallery 首屏优化 Sprint

策略:list-first(轻量 `<slug>.list.json` 首屏)+ 后台懒加载全文(供全文搜索/详情);保留旧全量路径作 fallback;cache-bust 已就位;`listMode` 可按源灰度。

基线(2026-09-27,ego-browser 实测):seedance-2-0 首屏 ~22s(37MB/6331 条);gpt-image-2 ~40s(82MB/17644 条);nano-banana-pro ~30s(52MB/12701);小库(opus/gemini-3/lemo)秒开。

## 步骤
- [ ] Step 1 构建侧:build-one 产 `<slug>.list.json`(卡片/筛选字段,去全文);gallery 注入 listMode;assemble 计数门(list=full)
- [ ] Step 2 前端:app.js loadData 改 list-first + 后台懒加载全文(失败回退全量)
- [ ] Step 3 本地验证 + ego-browser 首屏计时(seedance / gpt-image-2)
- [ ] Step 4 提交部署(cache-bust 自动生效)
- [ ] Step 5 验收:大库首屏 <3s;功能全绿(搜索/筛选/精选/Builder/详情/相关)

## commit 台账
| commit | 内容 |
|---|---|
|  |  |

## 遗留 / 后续可选
- detail 分桶(hash(id)%N 点卡才拉,避免大库首次交互也拉全量)—— 本次未做,list-first 已解决首屏;如需再上。
- 窗口化渲染(IntersectionObserver 分批)—— 本次未做。
