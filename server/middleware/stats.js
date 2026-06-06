import fs from 'fs/promises'
import path from 'path'

const STATS_FILE = path.resolve('./docs/metadata/stats.json')

// 内存缓存，避免每次请求都读写磁盘
const statsCache = {
  views: {},    // { "电气专业.md": 42 }
  daily: {},    // { "2026-06-01": 89 }
  totalViews: 0
}
let dirty = false
let loaded = false

/**
 * 启动时预加载统计（同步方式以避免竞态）
 */
async function loadStats() {
  if (loaded) return
  try {
    const raw = await fs.readFile(STATS_FILE, 'utf-8')
    const data = JSON.parse(raw)
    statsCache.views = data.fileStats || {}
    statsCache.daily = data.dailyViews || {}
    statsCache.totalViews = data.totalViews || 0
  } catch {
    // 文件不存在，使用空数据
  }
  loaded = true
}

/**
 * 写入统计到磁盘（防抖）
 */
async function saveStats() {
  if (!dirty) return
  await fs.mkdir(path.dirname(STATS_FILE), { recursive: true })
  await fs.writeFile(STATS_FILE, JSON.stringify({
    totalViews: statsCache.totalViews,
    fileStats: statsCache.views,
    dailyViews: statsCache.daily
  }, null, 2), 'utf-8')
  dirty = false
}

// 每 60 秒写入一次磁盘
setInterval(saveStats, 60000)

/**
 * 预加载统计（服务启动时调用）
 */
export async function initStats() {
  await loadStats()
  console.log('[Stats] Loaded from disk')
}

/**
 * 文件访问统计中间件
 * 只统计 GET /api/file/* 的请求
 */
export function statsMiddleware(req, res, next) {
  if (req.method === 'GET' && req.path.startsWith('/api/file/')) {
    // 解码 URL 编码的文件名（%E5%8C%97 → 北）
    const filePath = decodeURIComponent(req.path.replace('/api/file/', ''))
    const today = new Date().toISOString().split('T')[0]

    statsCache.totalViews++
    statsCache.views[filePath] = (statsCache.views[filePath] || 0) + 1
    statsCache.daily[today] = (statsCache.daily[today] || 0) + 1
    dirty = true

    // 保留最近 31 天
    const keys = Object.keys(statsCache.daily).sort()
    if (keys.length > 31) {
      const toDelete = keys.slice(0, keys.length - 31)
      toDelete.forEach(k => delete statsCache.daily[k])
    }
  }
  next()
}

/**
 * 获取统计数据
 * @param {string|null} filePath 指定文件路径或 null（返回总览）
 */
export function getStats(filePath = null) {
  if (filePath) {
    return { views: statsCache.views[filePath] || 0 }
  }
  return {
    totalViews: statsCache.totalViews,
    topFiles: Object.entries(statsCache.views)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([file, views]) => ({ file, views })),
    dailyViews: { ...statsCache.daily }
  }
}
