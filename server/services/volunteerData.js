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
// 志愿表用户自定义顺序文件路径
const ORDER_FILE = path.join(DOCS_DIR, '志愿表顺序.json')

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
    // 即使使用缓存数据，也要应用用户自定义顺序
    return applySavedOrders(cachedData)
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
    // 读取并应用用户自定义的志愿表/专业排序
    return applySavedOrders(cachedData)
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

/**
 * 读取保存的志愿表排序顺序（带内存缓存）
 * 文件不存在或解析失败时返回空对象
 */
const orderCache = { data: null, loaded: false }

export async function getSavedOrder() {
  if (!orderCache.loaded) {
    try {
      const raw = await fs.readFile(ORDER_FILE, 'utf-8')
      orderCache.data = JSON.parse(raw)
    } catch {
      orderCache.data = {}
    }
    orderCache.loaded = true
  }
  return orderCache.data
}

/**
 * 保存指定志愿表的排序顺序
 * 更新内存缓存后写入文件，避免连续拖拽时的竞态条件
 * @param {string} fileId - 志愿表标识（文件 stem）
 * @param {object} order - 排序数据
 * @param {number[]} [order.groups] - 分组编号的有序数组
 * @param {object} [order.majors] - 以分组编号为 key 的专业代码有序数组
 */
export async function saveOrder(fileId, { groups, majors }) {
  const allOrders = await getSavedOrder()

  // 确保该文件有条目
  if (!allOrders[fileId]) {
    allOrders[fileId] = {}
  }

  // 合并传入的排序数据
  if (groups !== undefined) {
    allOrders[fileId].groups = groups
  }
  if (majors !== undefined) {
    allOrders[fileId].majors = majors
  }

  // 写入文件（格式化为 2 空格缩进）
  await fs.writeFile(ORDER_FILE, JSON.stringify(allOrders, null, 2), 'utf-8')
}

/**
 * 将保存的顺序应用到单个志愿表的数据上（纯函数，不修改原对象）
 * 按 groups 数组对分组重新排序，按 majors 对专业重新排序
 * @param {object} fileData - 志愿表数据（含 groups 数组）
 * @param {object} orderEntry - 顺序配置
 * @param {number[]} [orderEntry.groups] - 分组编号的有序数组
 * @param {object} [orderEntry.majors] - 以分组编号为 key 的专业代码数组
 * @returns {object} - 排序后的新数据对象
 */
function applyOrderToFile(fileData, orderEntry) {
  if (!orderEntry || (!orderEntry.groups && !orderEntry.majors)) {
    return fileData
  }

  let orderedGroups

  if (orderEntry.groups) {
    // 按分组编号构建映射
    const groupMap = new Map()
    for (const group of fileData.groups) {
      groupMap.set(group.group_num, group)
    }

    orderedGroups = []
    // 先按保存的顺序添加
    for (const num of orderEntry.groups) {
      if (groupMap.has(num)) {
        orderedGroups.push(groupMap.get(num))
        groupMap.delete(num)
      }
    }
    // 追加未在顺序中的新分组（保持在末尾）
    for (const group of groupMap.values()) {
      orderedGroups.push(group)
    }
  } else {
    orderedGroups = [...fileData.groups]
  }

  // 应用专业排序
  if (orderEntry.majors) {
    orderedGroups = orderedGroups.map(group => {
      const majorOrder = orderEntry.majors[String(group.group_num)]
      if (!majorOrder) return group

      // 按专业代码构建映射
      const majorMap = new Map()
      for (const major of group.majors) {
        majorMap.set(major.code, major)
      }

      const orderedMajors = []
      // 先按保存的顺序添加
      for (const code of majorOrder) {
        if (majorMap.has(code)) {
          orderedMajors.push(majorMap.get(code))
          majorMap.delete(code)
        }
      }
      // 追加未在顺序中的新专业
      for (const major of majorMap.values()) {
        orderedMajors.push(major)
      }

      return { ...group, majors: orderedMajors }
    })
  }

  return { ...fileData, groups: orderedGroups }
}

/**
 * 读取顺序文件并将其应用到所有志愿表数据上
 * 如果没有顺序配置，返回原始数据
 * @param {object} data - 原始志愿表数据
 * @returns {object} - 应用顺序后的数据
 */
async function applySavedOrders(data) {
  const orderData = await getSavedOrder()
  if (!orderData || typeof orderData !== 'object' || Object.keys(orderData).length === 0) {
    return data
  }

  const merged = {}
  for (const fileId of Object.keys(data)) {
    const fileData = data[fileId]
    if (fileData && fileData.groups && orderData[fileId]) {
      merged[fileId] = applyOrderToFile(fileData, orderData[fileId])
    } else {
      merged[fileId] = fileData
    }
  }
  return merged
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
