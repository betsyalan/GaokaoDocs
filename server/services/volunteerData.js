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
 * 检查 JSON 输出文件是否比上次读取更新（支持外部脚本手动更新）
 */
async function jsonFileUpdated(lastReadTime) {
  try {
    const stat = await fs.stat(DATA_FILE)
    return stat.mtimeMs > lastReadTime
  } catch {
    return false
  }
}

/**
 * 获取所有志愿表数据
 * 首次加载或 Excel 更新时自动转换
 */
export async function getVolunteerData() {
  // 一次性检测，避免 needsConversion() 被调两次的副作用 bug
  const isStale = await needsConversion()
  const jsonUpdated = cachedData && !isStale
    ? await jsonFileUpdated(lastExcelMtime)
    : false

  // 缓存有效：有缓存 + Excel 无变更 + JSON 无外部变更
  if (cachedData && !isStale && !jsonUpdated) {
    return cachedData
  }

  try {
    if (isStale) {
      runConverter()
      lastExcelMtime = await getLatestExcelMtime()
    }
    // jsonUpdated 为 true 时跳过 converter，直接读取已更新好的 JSON

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
 * 强制触发转换：清缓存 → 运行 Python 脚本 → 更新时间戳
 * 供上传接口和文件监控调用
 */
export async function triggerConversion() {
  clearCache()
  runConverter()
  lastExcelMtime = await getLatestExcelMtime()
}

/**
 * 清除缓存
 */
export function clearCache() {
  cachedData = null
  cachedError = null
}

// ─── 文件系统监控 ─────────────────────────────────────────────

let watcher = null
let watcherTimer = null

/**
 * 启动对 docs/ 目录的监控，当发生新增/修改 .xlsx 文件时自动转换
 * 使用去抖（2 秒）避免重复触发
 */
export function startWatcher() {
  if (watcher) return // 已启动

  try {
    watcher = fs.watch(DOCS_DIR, (eventType, filename) => {
      // 只关注 XLSX 志愿表文件
      if (!filename || !filename.includes('志愿表') || !filename.endsWith('.xlsx')) return

      clearTimeout(watcherTimer)
      watcherTimer = setTimeout(async () => {
        console.log(`[志愿表] 检测到文件变更: ${filename}，自动转换...`)
        try {
          await triggerConversion()
          console.log('[志愿表] 自动转换完成')
        } catch (err) {
          console.error('[志愿表] 自动转换失败:', err.message)
        }
      }, 2000)
    })
    console.log('[志愿表] 文件监控已启动')
  } catch (err) {
    console.error('[志愿表] 文件监控启动失败:', err.message)
  }
}

/**
 * 停止文件监控（用于重启等场景）
 */
export function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
    clearTimeout(watcherTimer)
  }
}
