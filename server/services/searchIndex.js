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
      const content = [u.province, u.city, extra].filter(Boolean).join(' ')
      insert.run(`gaokao:uni:${u.university_code}`, u.university_name, segmentChinese(content))
      count++
    }

    // 专业名称（去重，附带大学名）
    const majors = gDb.prepare(`
      SELECT DISTINCT a.university_code, a.major_name, u.university_name
      FROM university_admission_data a
      LEFT JOIN universities_info u ON a.university_code = u.university_code
      WHERE a.major_name IS NOT NULL AND a.major_name != ''
    `).all()
    for (const m of majors) {
      const content = m.university_name || ''
      insert.run(`gaokao:maj:${m.university_code}:${m.major_name}`, m.major_name, segmentChinese(content))
      count++
    }

    gDb.close()
  } catch (err) {
    console.error('[Search] Failed to index gaokao data:', err.message)
  }

  console.log(`[Search] Indexed ${count} entries`)
}

/**
 * 搜索
 * @param {string} query
 * @returns {Array<{file, title, snippet}>}
 */
export function search(query) {
  if (!db) initSearch()

  // 对查询也做中文分词，使字词能匹配上已分词的索引
  const segmentedQuery = segmentChinese(query)

  try {
    const stmt = db.prepare(`
      SELECT file, title, snippet(docs_index, 2, '<b>', '</b>', '...', 64) as snippet
      FROM docs_index WHERE docs_index MATCH ?
      ORDER BY bm25(docs_index, 0, 3.0, 1.0)
      LIMIT 20
    `)
    return stmt.all(segmentedQuery)
  } catch {
    // SQL 语法错误（非法查询）时返回空
    return []
  }
}
