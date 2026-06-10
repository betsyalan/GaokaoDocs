import { Router } from 'express'
import { search, buildIndex } from '../services/searchIndex.js'

const router = Router()

// GET /api/search?q=关键词&page=1&limit=20  — 全文搜索（支持翻页）
router.get('/search', (req, res) => {
  const q = req.query.q
  if (!q || !q.trim()) {
    return res.json({ results: [], total: 0, page: 1, limit: 20 })
  }
  const page = Math.max(1, parseInt(req.query.page) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20))
  const data = search(q.trim(), page, limit)
  res.json(data)
})

// POST /api/search/reindex  — 手动重建索引
router.post('/search/reindex', async (req, res) => {
  try {
    await buildIndex()
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
