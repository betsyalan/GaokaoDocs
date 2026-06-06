import { Router } from 'express'
import { search, buildIndex } from '../services/searchIndex.js'

const router = Router()

// GET /api/search?q=关键词  — 全文搜索
router.get('/search', (req, res) => {
  const q = req.query.q
  if (!q || !q.trim()) {
    return res.json({ results: [] })
  }
  const results = search(q.trim())
  res.json({ results })
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
