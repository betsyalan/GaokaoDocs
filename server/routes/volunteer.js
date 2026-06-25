import { Router } from 'express'
import { getVolunteerData, getSavedOrder, saveOrder } from '../services/volunteerData.js'

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

// GET /api/volunteer-order — 获取所有文件的已保存排序
router.get('/volunteer-order', async (req, res) => {
  try {
    const order = await getSavedOrder()
    res.json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/volunteer-order — 保存指定文件的志愿表排序
router.post('/volunteer-order', async (req, res) => {
  try {
    const { fileId, groups, majors } = req.body
    if (!fileId) {
      return res.status(400).json({ error: '缺少 fileId 参数' })
    }
    await saveOrder(fileId, { groups, majors })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
