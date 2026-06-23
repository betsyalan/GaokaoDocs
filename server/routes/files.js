import { Router } from 'express'
import { getFiles, getFileContent, getXlsxPage } from '../services/fileReader.js'

const router = Router()

// GET /api/files?type=md  — 获取文件列表
router.get('/files', async (req, res) => {
  try {
    const files = await getFiles(req.query.type || null)
    res.json({ files })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/file/*  — 读取文件内容（* 为文件路径）
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

// GET /api/file-xlsx-page/*?page=1&pageSize=100  — 分页读取 xlsx 数据
router.get('/file-xlsx-page/*', async (req, res) => {
  try {
    const filePath = req.params[0]
    const page = parseInt(req.query.page) || 1
    const pageSize = Math.min(500, Math.max(1, parseInt(req.query.pageSize) || 100))
    const data = await getXlsxPage(filePath, page, pageSize)
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
