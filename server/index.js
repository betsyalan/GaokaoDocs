import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'

import fileRoutes from './routes/files.js'
import searchRoutes from './routes/search.js'
import tagRoutes from './routes/tags.js'
import statsRoutes from './routes/stats.js'
import adminRoutes from './routes/admin.js'
import volunteerRoutes from './routes/volunteer.js'
import gaokaoRoutes from './routes/gaokao.js'
import proxyRoutes from './routes/proxy.js'
import { statsMiddleware, initStats } from './middleware/stats.js'
import { initSearch, buildIndex } from './services/searchIndex.js'
import { startWatcher } from './services/volunteerData.js'

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
app.use('/api', volunteerRoutes)
app.use('/api', gaokaoRoutes)
app.use('/api', proxyRoutes)

// PDF 等大文件访问
app.use('/docs', express.static(path.resolve('./docs')))

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../dist')))

// 托管项目根目录静态文件（如志愿表预览.html 等独立页面）
app.use(express.static(path.join(__dirname, '..')))

// API 404 兜底：未知 API 路由返回 JSON 而非 SPA 页面
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' })
})

// SPA 回退：非 API 请求返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'))
})

// 启动前检查：管理员密码必须通过环境变量设置
if (!process.env.ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD environment variable is required')
  console.error('   export ADMIN_PASSWORD=your_password')
  process.exit(1)
}

// 初始化搜索索引和统计
initSearch()
initStats().catch(() => {})
buildIndex().catch(err => console.error('Build index failed:', err))

// 启动志愿表文件监控，新增 xlsx 时自动转换
startWatcher()

app.listen(PORT, () => {
  console.log(`Doc CMS running at http://localhost:${PORT}`)
})
