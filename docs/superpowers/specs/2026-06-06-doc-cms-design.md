# 文档内容管理系统（Doc CMS）设计方案

> 日期：2026-06-06
> 状态：已批准
> 技术栈：Vue3 + Express + SQLite FTS5

---

## 一、项目概述

构建一个 B/S 架构的文档内容管理系统，用于浏览、搜索、管理 `/docs` 目录下的 HTML、Markdown 和 PDF 文件。系统面向互联网公开发布，面向高考志愿填报信息文档库场景。

### 核心需求

- 支持 HTML 文件直接渲染（iframe 沙箱隔离）
- 支持 Markdown 文件转 HTML 渲染（marked.js）
- 支持 PDF 文件浏览器内预览（PDF.js）
- 支持全文搜索（SQLite FTS5）
- 支持标签分类管理
- 支持文件上传/删除/重命名管理
- 支持访问统计
- 后端仅负责文件读取和元数据，所有渲染工作由前端完成

---

## 二、系统架构

```
用户浏览器 (Vue3 SPA)
       │
       │ REST API
       ▼
Express 服务端 (单进程)
       │
       ├── 静态托管: dist/ (Vue3 构建产物)
       ├── REST API: /api/*
       │
       ▼
文件系统: /root/web/docs/
       ├── .html 文件
       ├── .md 文件
       ├── .pdf 文件
       ├── metadata/
       │   ├── tags.json      ← 标签数据
       │   └── stats.json     ← 访问统计
       └── search.db          ← SQLite FTS5 全文搜索索引
```

### 架构原则

1. **文件即数据库**：`/docs` 目录是唯一内容源，无需独立数据库
2. **渲染前置**：后端只读文件、返回原始内容，前端负责所有格式渲染
3. **内存友好**：搜索用 SQLite FTS5（磁盘持久化），不使用内存索引
4. **单进程部署**：Express 托管一切，部署最简

---

## 三、项目文件结构

```
/root/web/
├── package.json                  # 项目根配置
├── server/                       # 后端服务
│   ├── index.js                  # Express 入口
│   ├── routes/
│   │   ├── files.js              # 文件列表/读取 API
│   │   ├── search.js             # 全文搜索 API
│   │   ├── tags.js               # 标签管理 API
│   │   ├── stats.js              # 访问统计 API
│   │   └── admin.js              # 管理操作 API
│   ├── services/
│   │   ├── fileReader.js         # 读取 /docs 文件
│   │   └── searchIndex.js        # SQLite FTS5 索引管理
│   └── middleware/
│       └── stats.js              # 访问计数中间件
│
├── frontend/                     # 前端应用
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── main.js               # Vue3 入口
│   │   ├── App.vue               # 根组件 + 布局
│   │   ├── router/
│   │   │   └── index.js          # 路由配置
│   │   ├── views/
│   │   │   ├── Home.vue           # 首页（文件列表）
│   │   │   ├── DocumentView.vue   # 文档查看页
│   │   │   ├── Search.vue         # 搜索页
│   │   │   ├── AdminDashboard.vue # 管理面板
│   │   │   └── Stats.vue          # 统计看板
│   │   ├── components/
│   │   │   ├── FileCard.vue       # 文件卡片
│   │   │   ├── IframeViewer.vue   # HTML 渲染 (iframe)
│   │   │   ├── MdRenderer.vue     # Markdown 渲染
│   │   │   ├── PdfViewer.vue      # PDF 预览
│   │   │   ├── TagSelector.vue    # 标签选择器
│   │   │   └── NavBar.vue         # 导航栏
│   │   ├── api/
│   │   │   └── index.js           # API 请求封装
│   │   └── styles/
│   │       └── main.css           # 全局样式
│   └── dist/                      # 构建产物
│
├── docs/                          # 文档内容源
│   ├── 电气专业.md
│   ├── 报考清单.md
│   ├── 热门专业V2.md
│   ├── 北邮玛丽女王中外合办.html
│   ├── 广东省2026年普高招生工作规定.pdf
│   └── metadata/
│       ├── tags.json
│       └── stats.json
│
└── start.sh                       # 一键启动脚本
```

---

## 四、API 设计

### 文件接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/files` | 获取文件列表，支持 `?type=md/html/pdf` 过滤 |
| `GET` | `/api/file/*` | 获取文件内容，返回 `{ content, meta: { name, type, size, ext, mtime } }` |

### 搜索接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/search?q=关键词` | 全文搜索，返回 `[{ file, title, snippet, score }]` |
| `POST` | `/api/search/reindex` | 手动重建全文索引 |

### 标签接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/tags` | 获取所有标签及对应文件数 |
| `GET` | `/api/tags/:tag` | 获取某标签下的文件列表 |
| `POST` | `/api/tags` | 设置文件标签 `{ file, tags: [] }` |

### 统计接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/stats` | 总览统计（总文件数、总访问量、热门 Top10） |
| `GET` | `/api/stats/:file` | 单个文件访问统计 |

### 管理接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/admin/login` | 管理员登录，返回 JWT Token |
| `POST` | `/api/admin/upload` | 上传文件到 `/docs` |
| `DELETE` | `/api/admin/delete` | 删除文件 |
| `PUT` | `/api/admin/rename` | 重命名文件 |

### 前端路由

```
/             → Home.vue          文件列表首页
/file/*       → DocumentView.vue  文档查看页
/search       → Search.vue        搜索页
/admin        → AdminDashboard.vue 管理面板
/stats        → Stats.vue         统计看板
```

---

## 五、前端组件设计

### 页面结构与组件树

```
App.vue (整体布局)
├── NavBar.vue              → 顶部导航
├── <router-view>
│   ├── Home.vue            → 文件总览
│   │   ├── 类型筛选标签（全部 / HTML / MD / PDF）
│   │   └── FileCard.vue[]  → 文件卡片列表
│   │
│   ├── DocumentView.vue    → 文档查看页
│   │   ├── 文件元信息头（文件名、大小、修改时间、标签）
│   │   └── 条件渲染组件:
│   │       ├── IframeViewer.vue  → .html (srcdoc + sandbox)
│   │       ├── MdRenderer.vue    → .md (marked + highlight.js)
│   │       └── PdfViewer.vue     → .pdf (PDF.js 逐页渲染)
│   │
│   ├── Search.vue          → 搜索页
│   │   ├── 搜索输入框（300ms 防抖）
│   │   ├── 搜索结果列表 + 关键词高亮
│   │   └── 空结果 / 加载中 / 错误状态
│   │
│   ├── AdminDashboard.vue  → 管理面板
│   │   ├── 密码登录弹窗
│   │   ├── 文件拖拽上传
│   │   └── 文件管理列表（删除、重命名、标签编辑）
│   │
│   └── Stats.vue           → 统计看板
│       ├── 总览卡片（文件数/访问量/标签数）
│       ├── 热门文件 Top10
│       └── 30 日访问趋势图
```

### 核心渲染组件说明

**IframeViewer.vue** — HTML 渲染
- 使用 `srcdoc` 属性嵌入原始 HTML
- 设置 `sandbox="allow-same-origin"` 限制脚本权限
- 自动适配高度

**MdRenderer.vue** — MD 渲染
- 使用 `marked.js` 将 Markdown 转为 HTML
- 使用 `highlight.js` 代码高亮
- 自定义 `.md-content` 样式，优化阅读体验

**PdfViewer.vue** — PDF 渲染
- 使用 `pdfjs-dist` 逐页渲染到 Canvas
- 提供翻页导航（上一页/下一页/页码跳转）
- 支持缩放

---

## 六、搜索方案：SQLite FTS5

### 为什么不用内存索引

> 文件数量增多时，将所有文件内容加载到内存构建搜索索引会导致内存占用过高。

### 替代方案：SQLite FTS5

- **Node.js 22 原生**：`node:sqlite` 内置支持，无需额外安装依赖
- **磁盘持久化**：索引存储在 `docs/search.db`，服务器重启无需重建
- **增量更新**：仅处理新增/变更的文件，不改动已有索引
- **内存友好**：索引在磁盘，查询时按需加载，内存占用恒定
- **功能完备**：支持中文分词、BM25 相关度排序、关键词高亮

### 索引管理流程

```
服务启动:
  ├── 检查 docs/search.db 是否存在
  ├── 存在 → 检查文件修改时间，只索引变更的文件
  └── 不存在 → 扫描 /docs 下所有 .md/.html 文件，构建 FTS5 全文索引

搜索时:
  → SQL: SELECT file, title, snippet(content, 0, '<b>', '</b>', '...', 64)
       FROM docs_index WHERE content MATCH ?
  → 毫秒级响应

文件变更:
  → 上传/删除/重命名时增量更新索引
```

---

## 七、数据流与状态管理

- **无需 Pinia/Vuex**：使用 Vue3 Composition API (`ref`/`reactive`) 即可
- **请求封装**：`/src/api/index.js` 统一封装 fetch 调用
- **组件状态**：每个页面组件内独立管理 loading / error / data 状态
- **搜索防抖**：300ms 防抖避免频繁请求
- **文件缓存**：组件内 Map 缓存已加载文件，切换不重复请求

---

## 八、管理功能与访问控制

- 管理员登录：`POST /api/admin/login` + JWT Token
- 管理操作需要 `Authorization: Bearer <token>` 头
- 环境变量 `ADMIN_PASSWORD` 设置管理密码（必填，无默认值）
- 前端管理页检测未登录时弹出密码输入框

---

## 九、部署方案

### 开发
```bash
# 后端
node server/index.js

# 前端（热更新）
cd frontend && npm run dev
```

### 生产
```bash
cd frontend && npm run build    # 构建到 dist/
node server/index.js            # Express 托管一切
```

### 可选
- PM2 守护进程
- Nginx 反向代理 + SSL

---

## 十、技术依赖清单

### 后端 (server/)
- `express` — Web 框架
- `cors` — 跨域支持（开发环境）
- `multer` — 文件上传
- `jsonwebtoken` — 管理登录 JWT
- `node:sqlite` — SQLite FTS5（内置，Node 22+）
- `chokidar` — 文件变更监听（可选，用于自动重建索引）

### 前端 (frontend/)
- `vue` — 3.x
- `vue-router` — 路由
- `marked` — Markdown → HTML 转换
- `highlight.js` — 代码高亮
- `pdfjs-dist` — PDF 浏览器端渲染
