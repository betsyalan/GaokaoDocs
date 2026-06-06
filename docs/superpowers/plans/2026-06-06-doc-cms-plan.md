# Doc CMS 内容管理系统 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个完整的内容管理系统，支持浏览、搜索、管理 /docs 下的 HTML/MD/PDF 文件

**Architecture:** Express 单进程托管 Vue3 SPA 前端 + REST API 后端。后端只负责文件读写和元数据管理，所有格式渲染由前端完成。全文搜索使用 SQLite FTS5 替代内存索引。

**Tech Stack:** Vue3 + Vite + Vue Router + marked + highlight.js + pdfjs-dist | Express + multer + jsonwebtoken + SQLite FTS5 (node:sqlite)

---

## 文件职责清单

### 后端 (server/)
| 文件 | 职责 |
|------|------|
| `server/index.js` | Express 入口，注册中间件和路由，静态托管 |
| `server/routes/files.js` | 文件列表 GET /api/files、文件内容 GET /api/file/* |
| `server/routes/search.js` | 搜索 GET /api/search、重建索引 POST /api/search/reindex |
| `server/routes/tags.js` | 标签 CRUD：GET/POST /api/tags, GET /api/tags/:tag |
| `server/routes/stats.js` | 统计 GET /api/stats、GET /api/stats/:file |
| `server/routes/admin.js` | 管理：login / upload / delete / rename |
| `server/services/fileReader.js` | 扫描 /docs 目录，读取文件，检测类型 |
| `server/services/searchIndex.js` | SQLite FTS5 索引构建与查询 |
| `server/middleware/stats.js` | 请求级访问计数中间件 |

### 前端 (frontend/)
| 文件 | 职责 |
|------|------|
| `frontend/src/main.js` | Vue3 应用入口 |
| `frontend/src/App.vue` | 根组件，含布局框架 |
| `frontend/src/router/index.js` | 路由配置 |
| `frontend/src/api/index.js` | 所有 API 请求封装 |
| `frontend/src/views/Home.vue` | 首页：文件列表 |
| `frontend/src/views/DocumentView.vue` | 文档查看：按文件类型分发渲染组件 |
| `frontend/src/views/Search.vue` | 搜索页 |
| `frontend/src/views/AdminDashboard.vue` | 管理面板 |
| `frontend/src/views/Stats.vue` | 统计看板 |
| `frontend/src/components/FileCard.vue` | 文件卡片 |
| `frontend/src/components/IframeViewer.vue` | HTML iframe 渲染 |
| `frontend/src/components/MdRenderer.vue` | Markdown 渲染 (marked) |
| `frontend/src/components/PdfViewer.vue` | PDF 预览 (pdfjs) |
| `frontend/src/components/TagSelector.vue` | 标签选择器 |
| `frontend/src/components/NavBar.vue` | 顶部导航 |
| `frontend/src/styles/main.css` | 全局样式 |

---

### Task 1: 项目初始化 + 目录结构

**Files:**
- Create: `package.json`
- Create: `server/index.js`
- Create: `start.sh`

- [ ] **Step 1: 创建根目录 package.json**

```json
{
  "name": "doc-cms",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev:server": "node server/index.js",
    "dev:frontend": "cd frontend && npm run dev",
    "build:frontend": "cd frontend && npm run build",
    "start": "node server/index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "multer": "^1.4.5",
    "jsonwebtoken": "^9.0.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

```bash
cd /root/web && npm install
```

- [ ] **Step 3: 创建 start.sh**

```bash
#!/bin/bash
# Doc CMS 一键启动脚本
# 先构建前端，再启动服务

echo "📦 Building frontend..."
cd frontend && npm run build

echo "🚀 Starting server..."
cd /root/web && ADMIN_PASSWORD=your_password node server/index.js
```

- [ ] **Step 4: 创建 server/index.js 骨架**

```javascript
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../dist')))

// 路由占位（后续任务实现）
// import fileRoutes from './routes/files.js'
// app.use('/api', fileRoutes)

// SPA fallback：非 API 请求返回 index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  }
})

app.listen(PORT, () => {
  console.log(`Doc CMS running at http://localhost:${PORT}`)
})
```

---

### Task 2: 文件读取服务 + 文件列表 API

**Files:**
- Create: `server/services/fileReader.js`
- Create: `server/routes/files.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建 fileReader.js**

```javascript
import fs from 'fs/promises'
import path from 'path'

const DOCS_DIR = path.resolve('./docs')

/**
 * 获取 /docs 下所有文件列表
 * @param {string} type 过滤类型: 'md' | 'html' | 'pdf' | null
 * @returns {Array<{name, path, ext, size, mtime}>}
 */
export async function getFiles(type = null) {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (entry.isDirectory() && entry.name !== 'metadata') continue
    if (!entry.isFile()) continue

    const ext = path.extname(entry.name).toLowerCase().replace('.', '')
    if (!['html', 'md', 'pdf'].includes(ext)) continue
    if (type && ext !== type) continue

    const stat = await fs.stat(path.join(DOCS_DIR, entry.name))
    files.push({
      name: entry.name,
      path: entry.name,
      ext,
      size: stat.size,
      mtime: stat.mtime
    })
  }

  // 按修改时间倒序
  files.sort((a, b) => b.mtime - a.mtime)
  return files
}

/**
 * 读取单个文件原始内容
 * @param {string} filePath 文件名
 * @returns {{ content: string, meta: object }}
 */
export async function getFileContent(filePath) {
  const fullPath = path.join(DOCS_DIR, filePath)
  // 安全校验：防止目录穿越
  if (!fullPath.startsWith(DOCS_DIR)) {
    throw new Error('Invalid path')
  }

  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const stat = await fs.stat(fullPath)

  let content = null
  if (ext === 'pdf') {
    // PDF 返回文件路径
    content = `/docs/${filePath}`
  } else {
    content = await fs.readFile(fullPath, 'utf-8')
  }

  return {
    content,
    meta: {
      name: path.basename(filePath),
      ext,
      size: stat.size,
      mtime: stat.mtime
    }
  }
}
```

- [ ] **Step 2: 创建 routes/files.js**

```javascript
import { Router } from 'express'
import { getFiles, getFileContent } from '../services/fileReader.js'

const router = Router()

// GET /api/files?type=md
router.get('/files', async (req, res) => {
  try {
    const files = await getFiles(req.query.type || null)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/file/:path
router.get('/file/*', async (req, res) => {
  try {
    const filePath = req.params[0]
    const data = await getFileContent(filePath)
    res.json(data)
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

export default router
```

- [ ] **Step 3: 注册到 server/index.js**

在 `server/index.js` 中添加：
```javascript
import fileRoutes from './routes/files.js'
app.use('/api', fileRoutes)
```

---

### Task 3: SQLite FTS5 全文搜索

**Files:**
- Create: `server/services/searchIndex.js`
- Create: `server/routes/search.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建 searchIndex.js**

```javascript
import { DatabaseSync } from 'node:sqlite'
import fs from 'fs/promises'
import path from 'path'

const DOCS_DIR = path.resolve('./docs')
const DB_PATH = path.join(DOCS_DIR, 'search.db')

let db = null

/**
 * 初始化或打开 SQLite FTS5 数据库
 */
export function initSearch() {
  db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS docs_index USING fts5(
      file, title, content,
      tokenize='unicode61'
    )
  `)
}

/**
 * 提取纯文本（去 Markdown/HTML 标记）
 */
function extractText(content, ext) {
  if (ext === 'md') {
    return content
      .replace(/^#+\s+/gm, '')   // 去除标题标记
      .replace(/[`*~_]/g, '')     // 去除格式符号
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 链接转文字
      .replace(/>\s/g, '')        // 去除引用
      .replace(/-{3,}/g, '')      // 分隔线
  }
  if (ext === 'html') {
    return content.replace(/<[^>]+>/g, '')  // 去 HTML 标签
  }
  return content
}

/**
 * 提取标题（文件首行标题）
 */
function extractTitle(content, ext) {
  const lines = content.split('\n')
  if (ext === 'md') {
    const match = content.match(/^#\s+(.+)/m)
    return match ? match[1].trim() : lines[0]?.trim() || ''
  }
  if (ext === 'html') {
    const match = content.match(/<title>([^<]+)<\/title>/i)
    return match ? match[1].trim() : lines[0]?.trim() || ''
  }
  return ''
}

/**
 * 扫描 /docs，构建 FTS5 索引
 */
export async function buildIndex() {
  if (!db) initSearch()

  // 清空旧索引
  db.exec('DELETE FROM docs_index')

  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true })
  const insert = db.prepare('INSERT INTO docs_index (file, title, content) VALUES (?, ?, ?)')

  for (const entry of entries) {
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase().replace('.', '')
    if (!['html', 'md'].includes(ext)) continue  // PDF 不建索引

    const raw = await fs.readFile(path.join(DOCS_DIR, entry.name), 'utf-8')
    const title = extractTitle(raw, ext)
    const text = extractText(raw, ext)
    insert.run(entry.name, title, text)
  }

  console.log(`[Search] Indexed ${entries.filter(e => e.isFile()).length} files`)
}

/**
 * 搜索
 * @param {string} query
 * @returns {Array<{file, title, snippet}>}
 */
export function search(query) {
  if (!db) initSearch()

  try {
    const stmt = db.prepare(`
      SELECT file, title, snippet(docs_index, 2, '<b>', '</b>', '...', 64) as snippet
      FROM docs_index WHERE docs_index MATCH ?
      ORDER BY rank
      LIMIT 20
    `)
    return stmt.all(query)
  } catch {
    // SQL 语法错误（非法查询）时返回空
    return []
  }
}
```

- [ ] **Step 2: 创建 routes/search.js**

```javascript
import { Router } from 'express'
import { search, buildIndex } from '../services/searchIndex.js'

const router = Router()

// GET /api/search?q=关键词
router.get('/search', (req, res) => {
  const q = req.query.q
  if (!q || !q.trim()) {
    return res.json({ results: [] })
  }
  const results = search(q.trim())
  res.json({ results })
})

// POST /api/search/reindex
router.post('/search/reindex', async (req, res) => {
  try {
    await buildIndex()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 3: 在 server/index.js 启动时初始化索引**

```javascript
import { initSearch, buildIndex } from './services/searchIndex.js'
// 启动时初始化搜索
initSearch()
buildIndex().catch(err => console.error('Build index failed:', err))
```

---

### Task 4: 标签管理 API

**Files:**
- Create: `server/routes/tags.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建 routes/tags.js**

```javascript
import { Router } from 'express'
import fs from 'fs/promises'
import path from 'path'

const router = Router()
const TAGS_FILE = path.resolve('./docs/metadata/tags.json')

/**
 * 确保 metadata 目录和 tags.json 存在
 */
async function ensureTagsFile() {
  try {
    await fs.access(TAGS_FILE)
  } catch {
    await fs.mkdir(path.dirname(TAGS_FILE), { recursive: true })
    await fs.writeFile(TAGS_FILE, '{}', 'utf-8')
  }
}

/**
 * 读取 tags.json
 */
async function readTags() {
  await ensureTagsFile()
  const raw = await fs.readFile(TAGS_FILE, 'utf-8')
  return JSON.parse(raw)
}

/**
 * 写入 tags.json
 */
async function writeTags(data) {
  await fs.writeFile(TAGS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

/**
 * 标签数据结构：{ "电气专业.md": ["电气", "高考"] }
 */

// GET /api/tags — 获取所有标签及文件数
router.get('/tags', async (req, res) => {
  try {
    const data = await readTags()
    // 统计每个标签的文件数
    const tagCount = {}
    for (const files of Object.values(data)) {
      for (const tag of files) {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      }
    }
    res.json({ tags: tagCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/tags/:tag — 获取某标签下的文件列表
router.get('/tags/:tag', async (req, res) => {
  try {
    const data = await readTags()
    const files = Object.entries(data)
      .filter(([, tags]) => tags.includes(req.params.tag))
      .map(([file]) => file)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/tags — 设置文件标签 { file: "xxx.md", tags: ["电气"] }
router.post('/tags', async (req, res) => {
  try {
    const { file, tags } = req.body
    if (!file || !Array.isArray(tags)) {
      return res.status(400).json({ error: 'Invalid request' })
    }
    const data = await readTags()
    data[file] = tags
    await writeTags(data)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: 在 server/index.js 中注册**

```javascript
import tagRoutes from './routes/tags.js'
app.use('/api', tagRoutes)
```

---

### Task 5: 访问统计中间件 + API

**Files:**
- Create: `server/middleware/stats.js`
- Create: `server/routes/stats.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建 middleware/stats.js**

```javascript
import fs from 'fs/promises'
import path from 'path'

const STATS_FILE = path.resolve('./docs/metadata/stats.json')
const statsCache = { views: {}, daily: {}, totalViews: 0 }
let dirty = false

/**
 * 从磁盘加载统计
 */
async function loadStats() {
  try {
    const raw = await fs.readFile(STATS_FILE, 'utf-8')
    const data = JSON.parse(raw)
    statsCache.views = data.fileStats || {}
    statsCache.daily = data.dailyViews || {}
    statsCache.totalViews = data.totalViews || 0
  } catch {
    // 文件不存在，使用空数据
  }
}

/**
 * 写入统计到磁盘（防抖）
 */
async function saveStats() {
  if (!dirty) return
  await fs.writeFile(STATS_FILE, JSON.stringify({
    totalViews: statsCache.totalViews,
    fileStats: statsCache.views,
    dailyViews: statsCache.daily
  }, null, 2), 'utf-8')
  dirty = false
}

// 每 60 秒写入一次
setInterval(saveStats, 60000)

/**
 * 文件访问统计中间件
 */
export function statsMiddleware(req, res, next) {
  // 只统计 /api/file/* 的 GET 请求
  if (req.method === 'GET' && req.path.startsWith('/api/file/')) {
    const filePath = req.path.replace('/api/file/', '')
    const today = new Date().toISOString().split('T')[0]

    statsCache.totalViews++
    statsCache.views[filePath] = (statsCache.views[filePath] || 0) + 1
    statsCache.daily[today] = (statsCache.daily[today] || 0) + 1
    dirty = true

    // 清理 30 天前的数据
    const keys = Object.keys(statsCache.daily).sort()
    if (keys.length > 31) {
      const toDelete = keys.slice(0, keys.length - 31)
      toDelete.forEach(k => delete statsCache.daily[k])
    }
  }
  next()
}

// 获取统计数据的函数
export function getStats(filePath = null) {
  if (filePath) {
    return { views: statsCache.views[filePath] || 0 }
  }
  return {
    totalFiles: 0, // 由 files API 填充
    totalViews: statsCache.totalViews,
    topFiles: Object.entries(statsCache.views)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, views]) => ({ file, views })),
    dailyViews: statsCache.daily
  }
}

// 初始化加载
loadStats()
```

- [ ] **Step 2: 创建 routes/stats.js**

```javascript
import { Router } from 'express'
import { getStats } from '../middleware/stats.js'
import { getFiles } from '../services/fileReader.js'

const router = Router()

// GET /api/stats — 总览统计
router.get('/stats', async (req, res) => {
  try {
    const files = await getFiles()
    const stats = getStats()
    stats.totalFiles = files.length
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/stats/:file — 单个文件统计
router.get('/stats/:file', (req, res) => {
  try {
    const stats = getStats(req.params.file)
    res.json(stats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 3: 注册中间件和路由**

```javascript
import { statsMiddleware } from './middleware/stats.js'
import statsRoutes from './routes/stats.js'

app.use(statsMiddleware)
app.use('/api', statsRoutes)
```

---

### Task 6: 管理 API（登录 / 上传 / 删除 / 重命名）

**Files:**
- Create: `server/routes/admin.js`
- Modify: `server/index.js`

- [ ] **Step 1: 创建 routes/admin.js**

```javascript
import { Router } from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import fs from 'fs/promises'
import path from 'path'

const router = Router()
const DOCS_DIR = path.resolve('./docs')
const JWT_SECRET = process.env.JWT_SECRET || 'doc-cms-secret'

// 文件上传配置
const upload = multer({ dest: '/tmp/uploads/' })

/**
 * JWT 认证中间件
 */
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    jwt.verify(auth.split(' ')[1], JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}

// POST /api/admin/login — 管理员登录
router.post('/admin/login', (req, res) => {
  const { password } = req.body
  if (password === (process.env.ADMIN_PASSWORD || 'admin123')) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
    return res.json({ token })
  }
  res.status(403).json({ error: 'Wrong password' })
})

// POST /api/admin/upload — 上传文件
router.post('/admin/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const { originalname, path: tmpPath } = req.file
    const destPath = path.join(DOCS_DIR, originalname)
    await fs.copyFile(tmpPath, destPath)
    await fs.unlink(tmpPath)
    res.json({ ok: true, file: originalname })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/admin/delete — 删除文件
router.delete('/admin/delete', authMiddleware, async (req, res) => {
  try {
    const { file } = req.body
    if (!file) return res.status(400).json({ error: 'File name required' })
    const filePath = path.join(DOCS_DIR, file)
    if (!filePath.startsWith(DOCS_DIR)) return res.status(400).json({ error: 'Invalid path' })
    await fs.unlink(filePath)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/admin/rename — 重命名文件
router.put('/admin/rename', authMiddleware, async (req, res) => {
  try {
    const { oldName, newName } = req.body
    if (!oldName || !newName) return res.status(400).json({ error: 'Names required' })
    const oldPath = path.join(DOCS_DIR, oldName)
    const newPath = path.join(DOCS_DIR, newName)
    if (!oldPath.startsWith(DOCS_DIR) || !newPath.startsWith(DOCS_DIR)) {
      return res.status(400).json({ error: 'Invalid path' })
    }
    await fs.rename(oldPath, newPath)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: 注册路由**

```javascript
import adminRoutes from './routes/admin.js'
app.use('/api', adminRoutes)
```

---

### Task 7: 前端项目初始化 + API 封装

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.js`
- Create: `frontend/src/App.vue`
- Create: `frontend/src/router/index.js`
- Create: `frontend/src/api/index.js`

- [ ] **Step 1: 创建 frontend/package.json**

```json
{
  "name": "doc-cms-frontend",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.3.0",
    "marked": "^12.0.0",
    "highlight.js": "^11.9.0",
    "pdfjs-dist": "^4.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: 创建 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
})
```

- [ ] **Step 3: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文档内容管理系统</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 src/main.js**

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles/main.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

- [ ] **Step 5: 创建 src/router/index.js**

```javascript
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'Home', component: () => import('@/views/Home.vue') },
  { path: '/file/*', name: 'DocumentView', component: () => import('@/views/DocumentView.vue') },
  { path: '/search', name: 'Search', component: () => import('@/views/Search.vue') },
  { path: '/admin', name: 'Admin', component: () => import('@/views/AdminDashboard.vue') },
  { path: '/stats', name: 'Stats', component: () => import('@/views/Stats.vue') }
]

export default createRouter({
  history: createWebHistory(),
  routes
})
```

- [ ] **Step 6: 创建 src/api/index.js**

```javascript
const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  // 文件
  getFiles: (type) => request(`/files?type=${type || ''}`),
  getFile: (filePath) => request(`/file/${filePath}`),

  // 搜索
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  // 标签
  getTags: () => request('/tags'),
  getTagFiles: (tag) => request(`/tags/${tag}`),
  setTags: (file, tags) => request('/tags', {
    method: 'POST',
    body: JSON.stringify({ file, tags })
  }),

  // 统计
  getStats: () => request('/stats'),

  // 管理（需要 token）
  login: (password) => request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  upload: (formData, token) => fetch(BASE + '/admin/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }),
  deleteFile: (file, token) => request('/admin/delete', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ file })
  }),
  rename: (oldName, newName, token) => request('/admin/rename', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ oldName, newName })
  })
}
```

- [ ] **Step 7: 安装依赖**

```bash
cd /root/web/frontend && npm install
```

---

### Task 8: 导航栏 + 全局样式 + 首页文件列表

**Files:**
- Create: `frontend/src/components/NavBar.vue`
- Create: `frontend/src/styles/main.css`
- Create: `frontend/src/components/FileCard.vue`
- Create: `frontend/src/views/Home.vue`

- [ ] **Step 1: 创建 NavBar.vue**

```vue
<template>
  <nav class="navbar">
    <router-link to="/" class="navbar-brand">📚 Doc CMS</router-link>
    <div class="navbar-links">
      <router-link to="/" class="nav-link">首页</router-link>
      <router-link to="/search" class="nav-link">搜索</router-link>
      <router-link to="/stats" class="nav-link">统计</router-link>
      <router-link to="/admin" class="nav-link">管理</router-link>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: #1a1a2e;
  color: #eee;
  gap: 24px;
}
.navbar-brand {
  font-size: 18px;
  font-weight: bold;
  color: #e94560;
  text-decoration: none;
}
.navbar-links { display: flex; gap: 16px; }
.nav-link {
  color: #ccc;
  text-decoration: none;
  font-size: 14px;
}
.nav-link:hover { color: #fff; }
.nav-link.router-link-active { color: #e94560; font-weight: bold; }
</style>
```

- [ ] **Step 2: 创建 main.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: #f5f5f5;
  color: #333;
  min-height: 100vh;
}
a { color: #1a73e8; text-decoration: none; }
a:hover { text-decoration: underline; }
.container { max-width: 960px; margin: 0 auto; padding: 24px 16px; }
.page-title { font-size: 24px; margin-bottom: 20px; color: #1a1a2e; }

/* 加载中 */
.loading { text-align: center; padding: 40px; color: #999; }
/* 错误提示 */
.error-msg { text-align: center; padding: 40px; color: #e94560; }
/* 空状态 */
.empty-state { text-align: center; padding: 60px 20px; color: #999; }
.empty-state .icon { font-size: 48px; margin-bottom: 12px; }
```

- [ ] **Step 3: 创建 FileCard.vue**

```vue
<template>
  <router-link :to="`/file/${file.path}`" class="file-card">
    <span class="file-icon">{{ iconMap[file.ext] || '📄' }}</span>
    <div class="file-info">
      <div class="file-name">{{ file.name }}</div>
      <div class="file-meta">
        {{ file.ext.toUpperCase() }} · {{ formatSize(file.size) }} · {{ formatDate(file.mtime) }}
      </div>
    </div>
  </router-link>
</template>

<script setup>
defineProps({ file: Object })

const iconMap = { html: '🌐', md: '📝', pdf: '📕' }

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  margin-bottom: 8px;
  transition: box-shadow 0.2s;
}
.file-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  text-decoration: none;
}
.file-icon { font-size: 28px; }
.file-name { font-size: 16px; font-weight: 500; }
.file-meta { font-size: 12px; color: #999; margin-top: 4px; }
</style>
```

- [ ] **Step 4: 创建 Home.vue**

```vue
<template>
  <div class="container">
    <h1 class="page-title">文档列表</h1>

    <!-- 类型筛选 -->
    <div class="filter-bar">
      <button
        v-for="t in types" :key="t.key"
        :class="['filter-btn', { active: activeType === t.key }]"
        @click="activeType = t.key; loadFiles()"
      >{{ t.label }}</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 空状态 -->
    <div v-else-if="files.length === 0" class="empty-state">
      <div class="icon">📂</div>
      <p>暂无文件</p>
    </div>

    <!-- 文件列表 -->
    <FileCard v-for="f in files" :key="f.path" :file="f" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import FileCard from '@/components/FileCard.vue'

const files = ref([])
const loading = ref(true)
const error = ref(null)
const activeType = ref('')

const types = [
  { key: '', label: '全部' },
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'pdf', label: 'PDF' }
]

async function loadFiles() {
  loading.value = true
  error.value = null
  try {
    const data = await api.getFiles(activeType.value === 'all' ? '' : activeType.value)
    files.value = data.files
  } catch {
    error.value = '加载文件列表失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadFiles)
</script>

<style scoped>
.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; }
.filter-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}
.filter-btn.active {
  background: #1a73e8;
  color: #fff;
  border-color: #1a73e8;
}
</style>
```

- [ ] **Step 5: 创建 App.vue（完整布局）**

```vue
<template>
  <NavBar />
  <router-view />
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
</script>
```

---

### Task 9: 文档查看页（核心页面）

**Files:**
- Create: `frontend/src/views/DocumentView.vue`
- Create: `frontend/src/components/IframeViewer.vue`
- Create: `frontend/src/components/MdRenderer.vue`
- Create: `frontend/src/components/PdfViewer.vue`

- [ ] **Step 1: 创建 IframeViewer.vue**

```vue
<template>
  <iframe
    :srcdoc="content"
    sandbox="allow-same-origin"
    class="iframe-viewer"
  ></iframe>
</template>

<script setup>
defineProps({ content: String })
</script>

<style scoped>
.iframe-viewer {
  width: 100%;
  min-height: 80vh;
  border: none;
  background: #fff;
  border-radius: 8px;
}
</style>
```

- [ ] **Step 2: 创建 MdRenderer.vue**

```vue
<template>
  <div class="md-content" v-html="renderedHtml"></div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 配置 marked 使用 highlight.js
marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
})

const props = defineProps({ content: String })
const renderedHtml = computed(() => marked(props.content || ''))
</script>

<style>
.md-content {
  background: #fff;
  padding: 32px;
  border-radius: 8px;
  line-height: 1.75;
  font-size: 16px;
}
.md-content h1 { font-size: 28px; margin: 24px 0 12px; }
.md-content h2 { font-size: 22px; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
.md-content h3 { font-size: 18px; margin: 16px 0 8px; }
.md-content p { margin: 12px 0; }
.md-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
.md-content th, .md-content td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
.md-content th { background: #f8f8f8; font-weight: bold; }
.md-content pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
.md-content code { font-family: 'Fira Code', monospace; font-size: 14px; }
.md-content blockquote { border-left: 4px solid #1a73e8; padding-left: 16px; margin: 16px 0; color: #666; }
.md-content img { max-width: 100%; }
</style>
```

- [ ] **Step 3: 创建 PdfViewer.vue**

```vue
<template>
  <div class="pdf-viewer">
    <div class="pdf-toolbar">
      <button @click="prevPage" :disabled="currentPage <= 1">上一页</button>
      <span>{{ currentPage }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage >= totalPages">下一页</button>
    </div>
    <div class="pdf-canvas-wrap">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as pdfjs from 'pdfjs-dist'

// 设置 worker 路径
pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js'

const props = defineProps({ url: String })
const canvasRef = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
let pdfDoc = null

async function renderPage(num) {
  if (!pdfDoc) return
  const page = await pdfDoc.getPage(num)
  const scale = 1.5
  const viewport = page.getViewport({ scale })
  const canvas = canvasRef.value
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
}

onMounted(async () => {
  if (!props.url) return
  pdfDoc = await pdfjs.getDocument(props.url).promise
  totalPages.value = pdfDoc.numPages
  renderPage(1)
})

watch(currentPage, (page) => renderPage(page))

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<style scoped>
.pdf-viewer { background: #fff; border-radius: 8px; overflow: hidden; }
.pdf-toolbar {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 12px; background: #f8f8f8; border-bottom: 1px solid #eee;
}
.pdf-toolbar button { padding: 4px 12px; cursor: pointer; }
.pdf-toolbar span { font-size: 14px; color: #666; }
.pdf-canvas-wrap { padding: 16px; text-align: center; }
canvas { max-width: 100%; }
</style>
```

- [ ] **Step 4: 创建 DocumentView.vue**

```vue
<template>
  <div class="container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 文档内容 -->
    <template v-else-if="doc">
      <div class="doc-header">
        <h1>{{ doc.meta.name }}</h1>
        <div class="doc-meta">
          {{ doc.meta.ext.toUpperCase() }} · {{ formatSize(doc.meta.size) }} · {{ formatDate(doc.meta.mtime) }}
        </div>
      </div>

      <!-- HTML 渲染 -->
      <IframeViewer v-if="doc.meta.ext === 'html'" :content="doc.content" />

      <!-- Markdown 渲染 -->
      <MdRenderer v-else-if="doc.meta.ext === 'md'" :content="doc.content" />

      <!-- PDF 渲染 -->
      <PdfViewer v-else-if="doc.meta.ext === 'pdf'" :url="`/docs/${doc.meta.name}`" />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import IframeViewer from '@/components/IframeViewer.vue'
import MdRenderer from '@/components/MdRenderer.vue'
import PdfViewer from '@/components/PdfViewer.vue'

const route = useRoute()
const doc = ref(null)
const loading = ref(true)
const error = ref(null)

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN')
}

onMounted(async () => {
  try {
    const filePath = route.params.pathMatch || ''
    const data = await api.getFile(filePath)
    doc.value = data
  } catch (e) {
    error.value = '文件加载失败: ' + e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.doc-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ddd;
}
.doc-header h1 { font-size: 22px; margin-bottom: 8px; }
.doc-meta { font-size: 13px; color: #999; }
</style>
```

---

### Task 10: 搜索页面

**Files:**
- Create: `frontend/src/views/Search.vue`

- [ ] **Step 1: 创建 Search.vue**

```vue
<template>
  <div class="container">
    <h1 class="page-title">全文搜索</h1>

    <div class="search-box">
      <input
        v-model="query"
        type="text"
        placeholder="输入关键词搜索文档..."
        @input="onSearch"
        class="search-input"
      />
    </div>

    <div v-if="loading" class="loading">搜索中...</div>

    <div v-else-if="query && results.length === 0" class="empty-state">
      <div class="icon">🔍</div>
      <p>未找到匹配结果</p>
    </div>

    <div v-else class="results">
      <div v-for="r in results" :key="r.file" class="result-item">
        <router-link :to="`/file/${r.file}`" class="result-title">{{ r.file }}</router-link>
        <div class="result-snippet" v-html="r.snippet"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/api'

const query = ref('')
const results = ref([])
const loading = ref(false)
let debounceTimer = null

function onSearch() {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    results.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const data = await api.search(query.value.trim())
      results.value = data.results || []
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}
</script>

<style scoped>
.search-box { margin-bottom: 24px; }
.search-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
}
.search-input:focus { border-color: #1a73e8; }
.result-item {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.result-title { font-size: 16px; font-weight: 500; }
.result-snippet { font-size: 14px; color: #666; margin-top: 8px; line-height: 1.6; }
.result-snippet :deep(b) { color: #e94560; }
</style>
```

---

### Task 11: 管理面板页面

**Files:**
- Create: `frontend/src/views/AdminDashboard.vue`
- Create: `frontend/src/components/TagSelector.vue`

- [ ] **Step 1: 创建 TagSelector.vue**

```vue
<template>
  <div class="tag-selector">
    <div class="tag-list">
      <span v-for="tag in tags" :key="tag" class="tag" @click="$emit('remove', tag)">
        {{ tag }} ✕
      </span>
    </div>
    <div class="tag-input-row">
      <input
        v-model="newTag"
        @keydown.enter="addTag"
        placeholder="输入标签后回车"
        class="tag-input"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ tags: { type: Array, default: () => [] } })
const emit = defineEmits(['add', 'remove'])
const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !props.tags.includes(tag)) {
    emit('add', tag)
  }
  newTag.value = ''
}
</script>

<style scoped>
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.tag {
  display: inline-block;
  padding: 2px 10px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}
.tag:hover { background: #fce8e6; color: #e94560; }
.tag-input { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; }
</style>
```

- [ ] **Step 2: 创建 AdminDashboard.vue**

```vue
<template>
  <div class="container">
    <h1 class="page-title">管理面板</h1>

    <!-- 登录 -->
    <div v-if="!token" class="login-box">
      <input v-model="password" type="password" placeholder="管理密码" class="pwd-input" />
      <button @click="login" :disabled="!password">登录</button>
      <div v-if="loginError" class="error-msg">{{ loginError }}</div>
    </div>

    <!-- 管理界面 -->
    <template v-else>
      <!-- 上传 -->
      <section class="section">
        <h2>上传文件</h2>
        <input type="file" multiple @change="uploadFiles" />
      </section>

      <!-- 文件管理 -->
      <section class="section">
        <h2>文件管理</h2>
        <div v-for="f in files" :key="f.path" class="admin-row">
          <span class="admin-fname">{{ f.name }}</span>
          <TagSelector
            :tags="fileTags[f.name] || []"
            @add="(tag) => updateTags(f.name, [...(fileTags[f.name]||[]), tag])"
            @remove="(tag) => updateTags(f.name, (fileTags[f.name]||[]).filter(t => t !== tag))"
          />
          <button class="btn-danger" @click="deleteFile(f.name)">删除</button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import TagSelector from '@/components/TagSelector.vue'

const token = ref(null)
const password = ref('')
const loginError = ref(null)
const files = ref([])
const fileTags = ref({})

async function login() {
  try {
    const data = await api.login(password.value)
    token.value = data.token
    loginError.value = null
    loadData()
  } catch {
    loginError.value = '密码错误'
  }
}

async function loadData() {
  const data = await api.getFiles()
  files.value = data.files
  const tagsData = await api.getTags()
  // 重新获取标签映射
  for (const f of data.files) {
    try {
      const fileData = await api.getFile(f.path)
    } catch {}
  }
}

async function uploadFiles(e) {
  const formData = new FormData()
  for (const file of e.target.files) {
    formData.append('file', file)
  }
  await api.upload(formData, token.value)
  loadData()
}

async function deleteFile(name) {
  if (!confirm(`确定删除 "${name}"？`)) return
  await api.deleteFile(name, token.value)
  loadData()
}

async function updateTags(file, tags) {
  await api.setTags(file, tags)
  fileTags.value[file] = tags
}
</script>

<style scoped>
.login-box { max-width: 300px; margin: 40px auto; text-align: center; }
.pwd-input {
  width: 100%; padding: 10px; margin-bottom: 12px;
  border: 1px solid #ddd; border-radius: 4px; font-size: 16px;
}
.login-box button {
  width: 100%; padding: 10px; background: #1a73e8; color: #fff;
  border: none; border-radius: 4px; cursor: pointer;
}
.section { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 16px; }
.section h2 { font-size: 16px; margin-bottom: 12px; color: #1a1a2e; }
.admin-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid #eee;
}
.admin-fname { min-width: 200px; font-size: 14px; }
.btn-danger {
  padding: 4px 12px; background: #e94560; color: #fff;
  border: none; border-radius: 4px; cursor: pointer;
}
</style>
```

---

### Task 12: 统计看板页面

**Files:**
- Create: `frontend/src/views/Stats.vue`

- [ ] **Step 1: 创建 Stats.vue**

```vue
<template>
  <div class="container">
    <h1 class="page-title">访问统计</h1>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <template v-else>
      <!-- 总览卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-num">{{ stats.totalFiles }}</div>
          <div class="stat-label">文档总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.totalViews }}</div>
          <div class="stat-label">总访问量</div>
        </div>
      </div>

      <!-- 热门文件 Top10 -->
      <section class="section">
        <h2>热门文件 Top10</h2>
        <div v-for="(item, i) in stats.topFiles" :key="item.file" class="rank-row">
          <span class="rank-num">{{ i + 1 }}</span>
          <router-link :to="`/file/${item.file}`" class="rank-file">{{ item.file }}</router-link>
          <span class="rank-views">{{ item.views }} 次</span>
        </div>
        <div v-if="!stats.topFiles?.length" class="empty-state">
          <p>暂无访问数据</p>
        </div>
      </section>

      <!-- 近日访问趋势 -->
      <section class="section">
        <h2>近 30 天访问趋势</h2>
        <div class="bar-chart">
          <div v-for="(count, date) in sortedDaily" :key="date" class="bar-item">
            <div class="bar-fill" :style="{ height: barHeight(count) + '%' }"></div>
            <div class="bar-label">{{ date.slice(5) }}</div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'

const stats = ref({})
const loading = ref(true)
const error = ref(null)

const sortedDaily = computed(() => {
  if (!stats.value.dailyViews) return {}
  return Object.entries(stats.value.dailyViews)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
})

function barHeight(count) {
  const max = Math.max(...Object.values(stats.value.dailyViews || {}), 1)
  return (count / max) * 100
}

onMounted(async () => {
  try {
    stats.value = await api.getStats()
  } catch {
    error.value = '加载统计数据失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stat-cards { display: flex; gap: 16px; margin-bottom: 24px; }
.stat-card {
  flex: 1; background: #fff; padding: 24px; border-radius: 8px;
  text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.stat-num { font-size: 36px; font-weight: bold; color: #1a73e8; }
.stat-label { font-size: 14px; color: #999; margin-top: 4px; }
.section { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 16px; }
.section h2 { font-size: 16px; margin-bottom: 12px; color: #1a1a2e; }
.rank-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0; border-bottom: 1px solid #f5f5f5;
}
.rank-num { width: 28px; font-weight: bold; color: #999; }
.rank-file { flex: 1; font-size: 14px; }
.rank-views { font-size: 13px; color: #999; }
.bar-chart {
  display: flex; align-items: flex-end; gap: 2px;
  height: 120px; padding: 16px 0;
}
.bar-item { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bar-fill {
  width: 100%; background: #1a73e8; border-radius: 2px 2px 0 0;
  min-height: 2px; transition: height 0.3s;
}
.bar-label { font-size: 10px; color: #999; margin-top: 4px; writing-mode: vertical-lr; }
</style>
```

---

### Task 13: PDF 静态文件服务

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 添加 /docs 静态路由提供 PDF 文件访问**

在 `server/index.js` 中添加：
```javascript
// PDF 等大文件访问
app.use('/docs', express.static(path.resolve('./docs')))
```

**注意：** 这行需要在 API 路由之后注册，避免覆盖 API 路径。

---

### Task 14: 完整 server/index.js 整合

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: 写入最终的 server/index.js**

```javascript
import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import fileRoutes from './routes/files.js'
import searchRoutes from './routes/search.js'
import tagRoutes from './routes/tags.js'
import statsRoutes from './routes/stats.js'
import adminRoutes from './routes/admin.js'
import { statsMiddleware } from './middleware/stats.js'
import { initSearch, buildIndex } from './services/searchIndex.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// 中间件
app.use(cors())
app.use(express.json())
app.use(statsMiddleware)

// API 路由
app.use('/api', fileRoutes)
app.use('/api', searchRoutes)
app.use('/api', tagRoutes)
app.use('/api', statsRoutes)
app.use('/api', adminRoutes)

// PDF 等文件访问
app.use('/docs', express.static(path.resolve('./docs')))

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../dist')))

// SPA 回退
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'))
  }
})

// 初始化搜索索引
initSearch()
buildIndex().catch(err => console.error('Build index failed:', err))

app.listen(PORT, () => {
  console.log(`Doc CMS running at http://localhost:${PORT}`)
})
```

---

## Self-Review

完成后对照 spec 检查：

- [x] 文件浏览：Home.vue + FileCard.vue + DocumentView.vue
- [x] HTML 渲染：IframeViewer.vue (srcdoc + sandbox)
- [x] MD 渲染：MdRenderer.vue (marked + highlight.js)
- [x] PDF 渲染：PdfViewer.vue (PDF.js 逐页)
- [x] 搜索：SQLite FTS5 + Search.vue（300ms 防抖）
- [x] 标签管理：tags.js + TagSelector.vue
- [x] 管理面板：admin.js + AdminDashboard.vue（JWT 保护）
- [x] 访问统计：stats middleware + Stats.vue（30 日趋势）
- [x] 无额外数据库依赖（文件即数据源）
- [x] 内存友好（SQLite FTS5 替代 lunr 内存索引）
- [x] 前后端职责清晰（后端读文件，前端渲染）
