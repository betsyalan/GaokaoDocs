import { DatabaseSync } from 'node:sqlite'
import fs from 'fs/promises'
import path from 'path'

const DOCS_DIR = path.resolve('./docs')
const DB_PATH = path.join(DOCS_DIR, 'search.db')
const GAOKAO_DB_PATH = path.resolve('./data/gaokao_scores.db')

let db = null

/**
 * 中文文本分词：在 CJK 字符之间插入空格，使 FTS5 能逐个字符索引
 * @param {string} text
 * @returns {string}
 */
function segmentChinese(text) {
  // Unicode CJK 范围：一-鿿（基本），㐀-䶿（扩展A），豈-﫿（兼容）
  return text.replace(/([一-鿿㐀-䶿豈-﫿])/g, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 初始化或打开 SQLite FTS5 数据库
 */
export function initSearch() {
  db = new DatabaseSync(DB_PATH)
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS docs_index USING fts5(
      file, title, content,
      tokenize='unicode61'
    )
  `)
}

/**
 * 提取纯文本（去 Markdown/HTML 标记），然后做中文分词
 */
function extractText(content, ext) {
  let text = ''
  if (ext === 'md') {
    text = content
      .replace(/^#+\s+/gm, '')   // 去除标题标记
      .replace(/[`*~_]/g, '')     // 去除格式符号
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // 链接转文字
      .replace(/>\s/g, '')        // 去除引用
      .replace(/-{3,}/g, '')      // 分隔线
  } else if (ext === 'html') {
    text = content.replace(/<[^>]+>/g, '')  // 去 HTML 标签
  } else {
    text = content
  }
  // 中文分词：字之间加空格
  return segmentChinese(text)
}

/**
 * 提取标题
 */
function extractTitle(content, ext) {
  const lines = content.split('\n')
  if (ext === 'md') {
    const match = content.match(/^#\s+(.+)/m)
    return match ? match[1].trim() : lines[0]?.trim() || ''
  }
  if (ext === 'html') {
    const match = content.match(/<title>([^<]+)<\/title>/i)
    return match ? match[1].trim() : lines[0]?.trim() || ''
  }
  return ''
}

/**
 * 扫描 /docs，构建 FTS5 索引
 */
export async function buildIndex() {
  if (!db) initSearch()

  // 清空旧索引
  db.exec('DELETE FROM docs_index')

  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true })
  const insert = db.prepare('INSERT INTO docs_index (file, title, content) VALUES (?, ?, ?)')

  let count = 0
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue
    const ext = path.extname(entry.name).toLowerCase().replace('.', '')
    if (!['html', 'md'].includes(ext)) continue  // PDF 不建索引

    const raw = await fs.readFile(path.join(DOCS_DIR, entry.name), 'utf-8')
    const title = extractTitle(raw, ext)
    const text = extractText(raw, ext)
    insert.run(entry.name, title, text)
    count++
  }

  // 索引高考数据库中的大学和专业名称
  try {
    const gDb = new DatabaseSync(GAOKAO_DB_PATH)

    // 大学名称（附带所有专业名作为内容）
    const unis = gDb.prepare(`
      SELECT DISTINCT u.university_code, u.university_name, u.province, u.city
      FROM universities_info u
      WHERE u.university_code IN (SELECT DISTINCT university_code FROM university_admission_data)
    `).all()
    for (const u of unis) {
      const majors = gDb.prepare(`
        SELECT GROUP_CONCAT(major_name, ' ') as names
        FROM (SELECT DISTINCT major_name FROM university_admission_data
              WHERE university_code = ? AND major_name IS NOT NULL AND major_name != '')
      `).get(u.university_code)
      const extra = majors?.names || ''
      const content = [u.university_name, u.province, u.city, extra].filter(Boolean).join(' ')
      insert.run(`gaokao:uni:${u.university_code}`, u.university_name, segmentChinese(content))
      count++
      // 各专业独立条目（title/name 需分词，否则 FTS5 无法匹配单个中文字符）
      const majorRows = gDb.prepare(`
        SELECT DISTINCT major_name FROM university_admission_data
        WHERE university_code = ? AND major_name IS NOT NULL AND major_name != ''
      `).all(u.university_code)
      for (const mr of majorRows) {
        insert.run(`gaokao:maj:${u.university_code}:${mr.major_name}`, mr.major_name, segmentChinese(mr.major_name))
        count++
      }
    }

    gDb.close()
  } catch (err) {
    console.error('[Search] Failed to index gaokao data:', err.message)
  }

  console.log(`[Search] Indexed ${count} entries`)
}

/**
 * 搜索（支持翻页）
 * @param {string} query
 * @param {number} [page=1]
 * @param {number} [limit=20]
 * @returns {{ results: Array<{file, title, snippet}>, total: number, page: number, limit: number }}
 */
export function search(query, page = 1, limit = 20) {
  if (!db) initSearch()

  const segmentedQuery = segmentChinese(query)

  try {
    // 先查总数
    const countStmt = db.prepare(`
      SELECT COUNT(*) as total FROM docs_index WHERE docs_index MATCH ?
    `)
    const { total } = countStmt.get(segmentedQuery)

    // 再查分页数据
    const offset = (page - 1) * limit
    const stmt = db.prepare(`
      SELECT file, title, snippet(docs_index, 2, '<b>', '</b>', '...', 64) as snippet
      FROM docs_index WHERE docs_index MATCH ?
      ORDER BY bm25(docs_index, 0, 3.0, 1.0)
      LIMIT ? OFFSET ?
    `)
    const results = stmt.all(segmentedQuery, limit, offset)

    return { results, total, page, limit }
  } catch {
    return { results: [], total: 0, page, limit }
  }
}
