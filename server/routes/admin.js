import { Router } from 'express'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { buildIndex } from '../services/searchIndex.js'
import { clearCache, triggerConversion } from '../services/volunteerData.js'

const router = Router()
const DOCS_DIR = path.resolve('./docs')
// JWT 签名密钥：优先使用环境变量，否则启动时生成（重启后旧 token 失效）
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')

// 文件上传配置：存到系统临时目录
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
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminPassword) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD environment variable not set' })
  }
  if (password === adminPassword) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' })
    return res.json({ token })
  }
  res.status(403).json({ error: 'Wrong password' })
})

// POST /api/admin/upload — 上传文件
router.post('/admin/upload', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }
    const { originalname: rawName, path: tmpPath } = req.file
    // 修复中文文件名编码（multer 默认用 latin1 解码，中文会变乱码）
    const originalname = Buffer.from(rawName, 'latin1').toString('utf8')
    const destPath = path.join(DOCS_DIR, originalname)

    // 安全校验
    if (!destPath.startsWith(DOCS_DIR)) {
      await fs.unlink(tmpPath)
      return res.status(400).json({ error: 'Invalid path' })
    }

    // 重名检测
    try {
      await fs.access(destPath)
      await fs.unlink(tmpPath)
      return res.status(409).json({ error: `文件 "${originalname}" 已存在` })
    } catch {
      // 文件不存在，继续上传
    }

    await fs.copyFile(tmpPath, destPath)
    await fs.unlink(tmpPath)

    // 重建搜索索引
    buildIndex().catch(err => console.error('Reindex after upload failed:', err))

    // 如果是志愿表 Excel，立即转换 JSON
    if (originalname.includes('志愿表') && originalname.endsWith('.xlsx')) {
      triggerConversion().catch(err =>
        console.error('志愿表转换失败:', err.message)
      )
    }

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

    const filePath = path.resolve(DOCS_DIR, file)
    if (!filePath.startsWith(DOCS_DIR)) {
      return res.status(400).json({ error: 'Invalid path' })
    }

    await fs.unlink(filePath)

    // 清理标签
    const TAGS_FILE = path.resolve('./docs/metadata/tags.json')
    try {
      const tagRaw = await fs.readFile(TAGS_FILE, 'utf-8')
      const tagData = JSON.parse(tagRaw)
      if (tagData[file]) {
        delete tagData[file]
        await fs.writeFile(TAGS_FILE, JSON.stringify(tagData, null, 2), 'utf-8')
      }
    } catch {
      // tags.json 不存在或无效，忽略
    }

    // 重建搜索索引
    buildIndex().catch(err => console.error('Reindex after delete failed:', err))

    res.json({ ok: true })
  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).json({ error: 'File not found' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

// PUT /api/admin/rename — 重命名文件
router.put('/admin/rename', authMiddleware, async (req, res) => {
  try {
    const { oldName, newName } = req.body
    if (!oldName || !newName) {
      return res.status(400).json({ error: 'oldName and newName required' })
    }

    const oldPath = path.resolve(DOCS_DIR, oldName)
    const newPath = path.resolve(DOCS_DIR, newName)

    if (!oldPath.startsWith(DOCS_DIR) || !newPath.startsWith(DOCS_DIR)) {
      return res.status(400).json({ error: 'Invalid path' })
    }

    await fs.rename(oldPath, newPath)

    // 更新标签中的文件名
    const TAGS_FILE = path.resolve('./docs/metadata/tags.json')
    try {
      const tagRaw = await fs.readFile(TAGS_FILE, 'utf-8')
      const tagData = JSON.parse(tagRaw)
      if (tagData[oldName]) {
        tagData[newName] = tagData[oldName]
        delete tagData[oldName]
        await fs.writeFile(TAGS_FILE, JSON.stringify(tagData, null, 2), 'utf-8')
      }
    } catch {
      // tags.json 不存在或无效，忽略
    }

    // 重建搜索索引
    buildIndex().catch(err => console.error('Reindex after rename failed:', err))

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
