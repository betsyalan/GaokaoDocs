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
