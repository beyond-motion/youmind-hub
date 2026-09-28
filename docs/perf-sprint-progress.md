# youmind-hub Gallery 首屏优化 Sprint

策略:list-first(轻量 `<slug>.list.json` 首屏)+ 后台懒加载全文(供全文搜索/详情);保留旧全量路径作 fallback;cache-bust 已就位;`listMode` 可按源灰度。

基线(2026-09-27,ego-browser 实测):seedance-2-0 首屏 ~22s(37MB/6331 条);gpt-image-2 ~40s(82MB/17644 条);nano-banana-pro ~30s(52MB/12701);小库(opus/gemini-3/lemo)秒开。

## 步骤
- [x] Step 1 构建侧:build-one 产 `<slug>.list.json`(卡片/筛选字段,去全文);gallery 注入 listMode;assemble 计数门
- [x] Step 2 前端:app.js loadData 改 list-first + 后台原地合并全文(失败回退全量)
- [x] Step 3 本地验证 + ego-browser 首屏计时(seedance / gpt-image-2)
- [x] Step 4 提交部署(cache-bust 自动生效);修复 CI 漏传 list.json 的 bug
- [~] Step 5 验收:首屏大降(seedance 22→5s,gpt-image-2 40→8.6s,nano 30→11.7s);功能全绿;**大库仍未到 <3s**(瓶颈=一次性渲染上万卡)

## commit 台账
| commit | 内容 |
|---|---|
| 82b1d14 | list-first gallery(轻 list.json 首屏 + 后台合并全文) |
| 718b36f | fix(ci):补传 <slug>.list.json artifact(否则 worker 404、线上回退全量) |

## 遗留 / 后续可选
- detail 分桶(hash(id)%N 点卡才拉,避免大库首次交互也拉全量)—— 本次未做,list-first 已解决首屏;如需再上。
- 窗口化渲染(IntersectionObserver 分批)—— 本次未做。
