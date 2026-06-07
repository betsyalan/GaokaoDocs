import { Router } from 'express'
import { getVolunteerData } from '../services/volunteerData.js'

const router = Router()

// GET /api/volunteer — 返回志愿表数据
router.get('/volunteer', async (req, res) => {
  try {
    const data = await getVolunteerData()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
