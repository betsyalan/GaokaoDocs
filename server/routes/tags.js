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
// GET /api/tags?map=true — 额外返回 file→tags 完整映射
router.get('/tags', async (req, res) => {
  try {
    const data = await readTags()
    const tagCount = {}
    for (const files of Object.values(data)) {
      for (const tag of files) {
        tagCount[tag] = (tagCount[tag] || 0) + 1
      }
    }
    const result = { tags: tagCount }
    // ?map=true 时返回完整映射，供管理面板使用
    if (req.query.map === 'true') {
      result.map = data
    }
    res.json(result)
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
