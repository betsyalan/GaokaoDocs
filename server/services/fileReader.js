import fs from 'fs/promises'
import path from 'path'

const DOCS_DIR = path.resolve('./docs')

/**
 * 根据文件名和扩展名自动分类
 * @param {string} filename 文件名
 * @param {string} ext 扩展名（小写，无点）
 * @returns {string} 分类标识: university | major | guide | data | reference | page
 */
function classifyFile(filename, ext) {
  // Excel 文件 → 志愿数据
  if (ext === 'xlsx') return 'data'

  // PDF → 报考指南
  if (ext === 'pdf') return 'guide'

  // 文件名包含报考/高考/对比类关键词 → 报考指南
  if (/报考|高考|志愿填报|专业对比|热门专业|VS/.test(filename)) return 'guide'

  // 文件名含"大学"/"学院"或知名的大学简称 → 大学信息
  if (/大学|学院|北邮|中大|深大/.test(filename)) return 'university'

  // HTML 页面
  if (ext === 'html') return 'page'

  // 其余 markdown 默认为专业信息
  return 'major'
}

/**
 * 获取 /docs 下所有文件列表
 * @param {string} type 过滤类型: 'md' | 'html' | 'pdf' | null
 * @returns {Array<{name, path, ext, size, mtime, category}>}
 */
export async function getFiles(type = null) {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    // 跳过隐藏文件和 metadata 目录
    if (entry.name.startsWith('.')) continue

    const ext = path.extname(entry.name).toLowerCase().replace('.', '')
    if (!['html', 'md', 'pdf', 'xlsx'].includes(ext)) continue
    if (type && ext !== type) continue

    const stat = await fs.stat(path.join(DOCS_DIR, entry.name))
    files.push({
      name: entry.name,
      path: entry.name,
      ext,
      size: stat.size,
      mtime: stat.mtime,
      category: classifyFile(entry.name, ext)
    })
  }

  // 按修改时间倒序
  files.sort((a, b) => b.mtime - a.mtime)
  return files
}

/**
 * 读取单个文件原始内容
 * @param {string} filePath 文件名
 * @returns {{ content: string|null, meta: object }}
 */
export async function getFileContent(filePath) {
  const fullPath = path.resolve(DOCS_DIR, filePath)

  // 安全校验：防止目录穿越
  if (!fullPath.startsWith(DOCS_DIR)) {
    throw new Error('Invalid path')
  }

  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  const stat = await fs.stat(fullPath)

  let content = null
  if (ext === 'pdf') {
    // PDF 返回相对路径，前端直接访问 /docs/ 静态路由
    content = filePath
  } else {
    content = await fs.readFile(fullPath, 'utf-8')
  }

  return {
    content,
    meta: {
      name: path.basename(filePath),
      ext,
      size: stat.size,
      mtime: stat.mtime
    }
  }
}
