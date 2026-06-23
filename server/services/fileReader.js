import fs from 'fs/promises'
import path from 'path'
import { DatabaseSync } from 'node:sqlite'
import XLSX from 'xlsx'

const DOCS_DIR = path.resolve('./docs')
const DB_PATH = path.resolve('./data/gaokao_scores.db')

// 缓存大学名→省份映射，避免每次 getFiles() 都查库
let uniProvinceMap = null
function buildUniProvinceMap() {
  if (uniProvinceMap) return uniProvinceMap
  uniProvinceMap = {}
  try {
    const db = new DatabaseSync(DB_PATH)
    const rows = db.prepare(
      `SELECT university_name, province FROM universities_info`
    ).all()
    db.close()
    for (const r of rows) {
      uniProvinceMap[r.university_name] = r.province
    }
  } catch {
    // 数据库不可用时静默失败，不影响其他文件
  }
  return uniProvinceMap
}

/**
 * 根据文件名和扩展名自动分类
 * @param {string} filename 文件名
 * @param {string} ext 扩展名（小写，无点）
 * @returns {string} 分类标识: university | major | guide | data | admission | page
 */
function classifyFile(filename, ext) {
  // Excel 文件 → 志愿数据
  if (ext === 'xlsx') return 'data'

  // PDF 含"分数段"关键词 → 一分一段表
  if (ext === 'pdf' && /分数段/.test(filename)) return 'distribution'

  // PDF → 报考指南
  if (ext === 'pdf') return 'guide'

  // 文件名包含报考/高考/对比类关键词 → 报考指南
  if (/报考|高考|志愿填报|专业对比|热门专业|VS/.test(filename)) return 'guide'

  // 文件名含"大学"/"学院"或知名的大学简称 → 大学信息
  if (/大学|学院|北邮|中大|深大/.test(filename)) return 'university'

  // HTML 页面
  if (ext === 'html' || ext === 'htm') return 'page'

  // 其余 markdown 默认为专业信息
  return 'major'
}

/**
 * 判断文件是否应归入"历年录取分"分类
 * 适用于图片和代理页面等包含大学录取数据的文件
 * @param {string} filename 文件名（含扩展名）
 * @returns {string|null} 匹配到的省份，或 null
 */
function classifyAdmissionFile(filename) {
  const ext = path.extname(filename).toLowerCase().replace('.', '')
  const admissible = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'htm', 'html']
  if (!admissible.includes(ext)) return null

  const map = buildUniProvinceMap()
  if (!map) return null

  // 按名称长度降序匹配（先匹配更长的大学名，避免"深圳大学"误匹配"深圳技术大学"）
  const uniNames = Object.keys(map).sort((a, b) => b.length - a.length)
  for (const name of uniNames) {
    if (filename.includes(name)) {
      return map[name]
    }
  }
  return null
}

/**
 * 获取 /docs 下所有文件列表
 * @param {string} type 过滤类型: 'md' | 'html' | 'pdf' | null
 * @returns {Array<{name, path, ext, size, mtime, category, province?}>}
 */
export async function getFiles(type = null) {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    // 跳过隐藏文件和 metadata 目录
    if (entry.name.startsWith('.')) continue

    const ext = path.extname(entry.name).toLowerCase().replace('.', '')
    if (!['html', 'htm', 'md', 'pdf', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) continue
    if (type && ext !== type) continue

    const stat = await fs.stat(path.join(DOCS_DIR, entry.name))
    const category = classifyFile(entry.name, ext)

    // 如果是图片且文件名匹配已知大学 → 归入录取分并标注省份
    const admissionProvince = classifyAdmissionFile(entry.name)
    const finalCategory = admissionProvince ? 'admission' : category

    files.push({
      name: entry.name,
      path: entry.name,
      ext,
      size: stat.size,
      mtime: stat.mtime,
      category: finalCategory,
      province: admissionProvince || undefined
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
  let renderExt = ext

  if (ext === 'pdf' || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    // PDF 和图片返回相对路径，前端直接访问 /docs/ 静态路由
    content = filePath
  } else if (ext === 'xlsx') {
    // Excel 文件：只返回元数据（不含内容），前端通过分页 API 逐页加载
    renderExt = 'xlsx-html'
  } else {
    content = await fs.readFile(fullPath, 'utf-8')

    // 检测代理标记：.htm/.html 文件第一行 //proxy:URL
    if (['htm', 'html'].includes(ext) && content.startsWith('//proxy:')) {
      const proxyUrl = content.replace('//proxy:', '').trim()
      return {
        content: proxyUrl,
        meta: {
          name: path.basename(filePath),
          ext: 'proxy',
          size: stat.size,
          mtime: stat.mtime
        }
      }
    }
  }

  const meta = {
    name: path.basename(filePath),
    ext: renderExt,
    size: stat.size,
    mtime: stat.mtime
  }
  // xlsx-html 时保留原始 ext 供前端展示标签（显示 XLSX 而非 XLSX-HTML）
  if (renderExt === 'xlsx-html') {
    meta.originalExt = ext
  }

  // 2023 年分数段 PDF 只展示第 15-28 页
  if (ext === 'pdf' && filePath.includes('2023') && /分数段/.test(filePath)) {
    meta.pageRange = { start: 15, end: 28 }
  }

  return { content, meta }
}

/**
 * 按页获取 xlsx 文件数据（JSON 格式，供前端分页展示）
 * @param {string} filePath 文件名
 * @param {number} page 页码（从 1 开始）
 * @param {number} pageSize 每页行数
 * @returns {{ headers: string[], rows: string[][], total: number, page: number, pageSize: number, totalPages: number }}
 */
export async function getXlsxPage(filePath, page = 1, pageSize = 100) {
  const fullPath = path.resolve(DOCS_DIR, filePath)
  if (!fullPath.startsWith(DOCS_DIR)) throw new Error('Invalid path')

  const ext = path.extname(filePath).toLowerCase().replace('.', '')
  if (ext !== 'xlsx') throw new Error('Not an xlsx file')

  const workbook = XLSX.readFile(fullPath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]

  // 用 header: 1 读取为二维数组（每行一个数组，无键名）
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1 })
  if (raw.length === 0) {
    return { headers: [], rows: [], total: 0, page, pageSize, totalPages: 0 }
  }

  // 将 raw 中每行转为字符串数组，过滤空行
  const rows2d = raw.map(row =>
    (Array.isArray(row) ? row : [row]).map(cell => cell === null || cell === undefined ? '' : String(cell))
  ).filter(row => row.some(c => c !== ''))

  // 找到第一个有效列数 > 3 的行作为表头（跳过合并单元格等占位行）
  let headerIdx = 0
  for (let i = 0; i < Math.min(rows2d.length, 10); i++) {
    const filled = rows2d[i].filter(c => c !== '').length
    if (filled > 3) { headerIdx = i; break }
  }

  const headers = rows2d[headerIdx] || []
  const allRowsStr = rows2d.slice(headerIdx + 1)

  const total = allRowsStr.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.max(1, Math.min(page, totalPages))

  const start = (safePage - 1) * pageSize
  const end = Math.min(start + pageSize, total)
  const rows = allRowsStr.slice(start, end)

  return { headers, rows, total, page: safePage, pageSize, totalPages }
}
