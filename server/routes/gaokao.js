import { Router } from 'express'
import { getUniversities, getAdmissionByCode, getDistribution } from '../services/gaokaoData.js'

const router = Router()

// GET /api/gaokao/universities — 获取大学列表（按省份分组）
router.get('/gaokao/universities', (req, res) => {
  try {
    const data = getUniversities()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/gaokao/admission/:code — 获取指定大学录取数据
router.get('/gaokao/admission/:code', (req, res) => {
  try {
    const data = getAdmissionByCode(req.params.code)
    if (!data) {
      return res.status(404).json({ error: '大学未找到' })
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/gaokao/distribution — 获取一分一段表
router.get('/gaokao/distribution', (req, res) => {
  try {
    const data = getDistribution()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
