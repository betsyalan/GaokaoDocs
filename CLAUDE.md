# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# 启动后端服务（需要 ADMIN_PASSWORD 环境变量）
export ADMIN_PASSWORD=your_password && npm start

# 开发模式（前后端分离）
npm run dev:server       # 后端 Express 服务
npm run dev:frontend     # 前端 Vite 开发服务器

# 构建前端
npm run build:frontend
cd frontend && npm run build

# 志愿表 Excel → JSON 转换（自动检测变更，手动触发）
python3 docs/excel2json.py
```

## Architecture

### Overview

高考志愿填报文档管理系统。前端 Vue 3 + Vite，后端 Node.js + Express。Markdown/PDF/Excel 文档浏览，高考录取数据展示，志愿表排序管理。

### Key Data Flow

```
docs/*.xlsx (志愿表) → docs/excel2json.py → docs/volunteer-data.json → api → VolunteerPreview.vue
docs/* (各类文件)    → fileReader.js       → api → DocumentView.vue / PdfViewer.vue / MdRenderer.vue
```

### Backend (`server/`)

| File | Responsibility |
|---|---|
| `index.js` | Express 入口，挂载所有路由，初始化搜索索引和志愿表监控 |
| `routes/volunteer.js` | 志愿表数据 API (`GET /api/volunteer`)、排序 API (`GET/POST /api/volunteer-order`) |
| `routes/files.js` | 文件列表、文件内容、xlsx 分页读取 |
| `routes/admin.js` | 文件上传（需要 ADMIN_PASSWORD 验证） |
| `routes/gaokao.js` | 高考录取数据 API（分布图、院校详情） |
| `routes/search.js`, `routes/stats.js`, `routes/proxy.js`, `routes/tags.js` | 搜索、统计、页面代理、标签 |
| `services/volunteerData.js` | 志愿表核心服务：监控 xlsx 变更、触发 Python 转换、读写排序状态 |
| `services/fileReader.js` | 通用文件读取：自动检测类型、xlsx 分页解析、排序 |
| `services/gaokaoData.js` | 高考录取数据库查询 |
| `services/searchIndex.js` | 文档内容搜索索引 |
| `services/pageProxy.js` | 外部页面代理 |

### Frontend (`frontend/src/`)

| Path | Responsibility |
|---|---|
| `views/VolunteerPreview.vue` | 志愿表预览（学校卡片、概率指示器、拖拽排序、筛选搜索） |
| `views/DocumentView.vue` | 通用文档查看器（自动切换 Markdown/PDF/图片/xlsx 表格渲染） |
| `views/GaokaoDistribution.vue` | 高考录取分布图 |
| `views/GaokaoAdmissionDetail.vue` | 院校录取详情（历年分数线、专业录取数据） |
| `views/Home.vue` | 首页文件浏览器 |
| `views/Search.vue` | 全文搜索 |
| `views/AdminDashboard.vue` | 管理后台（文件上传） |
| `views/Stats.vue` | 访问统计 |
| `components/NavBar.vue` | 顶部导航 |
| `components/FileSidebar.vue` | 文件侧边栏（树形目录+分类筛选） |
| `components/FileCard.vue` | 文件卡片组件 |
| `components/PdfViewer.vue` | PDF 渲染 |
| `components/MdRenderer.vue` | Markdown 渲染 |
| `components/ImageViewer.vue` | 图片灯箱查看 |
| `router/index.js` | Vue Router 路由定义 |

### 志愿表系统 (`docs/` 中的 xlsx 文件)

- 文件名包含 `志愿表` 的 xlsx 文件被识别为志愿表数据
- `excel2json.py` 解析 xlsx -> `volunteer-data.json`
- 用户通过拖拽自定义的排序存储在 `志愿表顺序.json`
- 后端 `volunteerData.js` 的 `applyOrderToFile()` 在返回数据时合并排序

### Styling

三套主题（琉璃/尘尔/紫烟）定义在 `VolunteerPreview.vue` 的 CSS 变量中，通过 `useTheme` composable 切换。
