/**
 * 高考志愿表数据服务
 * 自动检测 Excel 文件变更，调用 Python 脚本转换为 JSON
 */
import { execSync } from 'child_process'
import fs from 'fs/promises'
import path from 'path'

const DOCS_DIR = path.resolve('./docs')
const DATA_FILE = path.join(DOCS_DIR, 'volunteer-data.json')
const CONVERTER = path.join(DOCS_DIR, 'excel2json.py')

// 内存缓存
let cachedData = null
let cachedError = null
let lastExcelMtime = 0

/**
 * 获取 Excel 文件的最新修改时间
 */
async function getLatestExcelMtime() {
  const files = await fs.readdir(DOCS_DIR)
  const xlsxFiles = files.filter(f => f.includes('志愿表') && f.endsWith('.xlsx'))
  if (xlsxFiles.length === 0) return 0

  let latest = 0
  for (const f of xlsxFiles) {
    const stat = await fs.stat(path.join(DOCS_DIR, f))
    if (stat.mtimeMs > latest) latest = stat.mtimeMs
  }
  return latest
}

/**
 * 检查是否需要重新转换
 */
async function needsConversion() {
  const excelMtime = await getLatestExcelMtime()
  if (excelMtime === 0) return false

  if (excelMtime > lastExcelMtime) {
    lastExcelMtime = excelMtime
    return true
  }

  // JSON 文件不存在也需转换
  try {
    await fs.access(DATA_FILE)
    return false
  } catch {
    return true
  }
}

/**
 * 运行 Python 脚本转换 Excel → JSON
 */
function runConverter() {
  try {
    execSync(`python3 "${CONVERTER}"`, {
      cwd: DOCS_DIR,
      stdio: 'pipe',
      timeout: 30000
    })
  } catch (err) {
    throw new Error(`Excel 转换失败: ${err.stderr?.toString() || err.message}`)
  }
}

/**
 * 获取所有志愿表数据
 * 首次加载或 Excel 更新时自动转换
 */
export async function getVolunteerData() {
  if (cachedData && !(await needsConversion())) {
    return cachedData
  }

  try {
    if (await needsConversion()) {
      runConverter()
      // 更新缓存时间戳
      lastExcelMtime = await getLatestExcelMtime()
    }

    const raw = await fs.readFile(DATA_FILE, 'utf-8')
    cachedData = JSON.parse(raw)
    cachedError = null
    return cachedData
  } catch (err) {
    cachedError = err
    throw err
  }
}

/**
 * 清除缓存
 */
export function clearCache() {
  cachedData = null
  cachedError = null
}
