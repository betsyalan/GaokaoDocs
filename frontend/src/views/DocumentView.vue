<template>
  <div :class="['container', { 'container-full': isFullWidth, 'container-pdf': doc?.meta?.ext === 'pdf' }]">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 文档内容 -->
    <template v-else-if="doc">
      <!-- 代理页面不显示标题栏（外部页面自带导航） -->
      <div v-if="!isProxy" class="doc-header">
        <h1>{{ displayTitle }}</h1>
        <div class="doc-meta">
          {{ displayExt }} · {{ formatSize(doc.meta.size) }} · {{ formatDate(doc.meta.mtime) }}
          <a v-if="doc.meta.originalExt === 'xlsx'" :href="`/docs/${doc.meta.name}`" class="download-link" download>⬇ 下载原始文件</a>
        </div>
      </div>

      <!-- HTML 渲染 -->
      <IframeViewer v-if="doc.meta.ext === 'html'" :content="doc.content" />

      <!-- Markdown 渲染 -->
      <MdRenderer v-else-if="doc.meta.ext === 'md'" :content="doc.content" />

      <!-- PDF 渲染 -->
      <PdfViewer v-else-if="doc.meta.ext === 'pdf'" :url="`/docs/${doc.meta.name}`" :pageRange="doc.meta.pageRange" />

      <!-- 图片渲染 -->
      <ImageViewer v-else-if="['png','jpg','jpeg','gif','webp','svg'].includes(doc.meta.ext)" :filePath="doc.meta.name" :meta="doc.meta" />

      <!-- 外部代理页面 -->
      <ExternalPageViewer v-else-if="doc.meta.ext === 'proxy'" :url="doc.content" />

      <!-- Excel 表格渲染（分页） -->
      <template v-else-if="doc.meta.ext === 'xlsx-html'">
        <!-- 加载数据中 -->
        <div v-if="xlsxLoading" class="loading">📊 加载表格数据...</div>
        <div v-else-if="xlsxError" class="error-msg">{{ xlsxError }}</div>
        <template v-else-if="xlsxHeaders.length > 0">
          <!-- 分页信息栏 -->
          <div class="xlsx-info-bar">
            <span class="xlsx-info-text">共 {{ xlsxTotal }} 行，每页 {{ xlsxPageSize }} 行</span>
            <span class="xlsx-info-text">第 {{ xlsxPage }} / {{ xlsxTotalPages }} 页</span>
            <label class="xlsx-page-size">
              每页
              <select v-model.number="xlsxPageSize" @change="goXlsxPage(1)">
                <option :value="50">50</option>
                <option :value="100">100</option>
                <option :value="200">200</option>
                <option :value="500">500</option>
              </select>
              行
            </label>
          </div>
          <!-- 表格 -->
          <div class="xlsx-wrap">
            <table>
              <thead>
                <tr>
                  <th class="xlsx-row-num">#</th>
                  <th v-for="(h, i) in xlsxHeaders" :key="i">{{ h }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, ri) in xlsxRows" :key="ri">
                  <td class="xlsx-row-num">{{ (xlsxPage - 1) * xlsxPageSize + ri + 1 }}</td>
                  <td v-for="(cell, ci) in row" :key="ci">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <!-- 分页按钮 -->
          <div class="xlsx-pagination">
            <button :disabled="xlsxPage <= 1" @click="goXlsxPage(1)">⏮ 首页</button>
            <button :disabled="xlsxPage <= 1" @click="goXlsxPage(xlsxPage - 1)">◀ 上一页</button>
            <template v-for="(p, pi) in xlsxPageButtons" :key="pi">
              <span v-if="p === '...'" class="xlsx-ellipsis">…</span>
              <button v-else
                :class="['xlsx-page-btn', { active: p === xlsxPage }]"
                @click="goXlsxPage(p)">{{ p }}</button>
            </template>
            <button :disabled="xlsxPage >= xlsxTotalPages" @click="goXlsxPage(xlsxPage + 1)">下一页 ▶</button>
            <button :disabled="xlsxPage >= xlsxTotalPages" @click="goXlsxPage(xlsxTotalPages)">末页 ⏭</button>
          </div>
        </template>
        <div v-else class="empty-state">📂 表格为空</div>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import IframeViewer from '@/components/IframeViewer.vue'
import MdRenderer from '@/components/MdRenderer.vue'
import PdfViewer from '@/components/PdfViewer.vue'
import ImageViewer from '@/components/ImageViewer.vue'
import ExternalPageViewer from '@/components/ExternalPageViewer.vue'

const route = useRoute()
const doc = ref(null)
const loading = ref(true)
const error = ref(null)

// xlsx 分页状态
const xlsxHeaders = ref([])
const xlsxRows = ref([])
const xlsxTotal = ref(0)
const xlsxPage = ref(1)
const xlsxPageSize = ref(100)
const xlsxTotalPages = ref(0)
const xlsxLoading = ref(false)
const xlsxError = ref(null)

// 用于丢弃过期响应的递增计数器，防止竞态条件
let xlsxFetchGen = 0

/** 生成显示的页码按钮列表（最多 7 个） */
const xlsxPageButtons = computed(() => {
  const total = xlsxTotalPages.value
  const cur = xlsxPage.value
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = []
  // 始终显示第 1 页
  pages.push(1)
  let start = Math.max(2, cur - 2)
  let end = Math.min(total - 1, cur + 2)
  if (cur <= 4) { start = 2; end = Math.min(6, total - 1) }
  if (cur >= total - 3) { start = Math.max(total - 5, 2); end = total - 1 }
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)
  return pages
})

/** 加载 xlsx 分页数据（带竞态保护） */
async function goXlsxPage(page) {
  if (!doc.value || doc.value.meta.originalExt !== 'xlsx') return
  const gen = ++xlsxFetchGen
  xlsxLoading.value = true
  xlsxError.value = null
  try {
    const encoded = encodeURIComponent(doc.value.meta.name)
    const res = await fetch(`/api/file-xlsx-page/${encoded}?page=${page}&pageSize=${xlsxPageSize.value}`)
    if (gen !== xlsxFetchGen) return // 已有新请求，丢弃过期响应
    if (!res.ok) throw new Error(`请求失败 (${res.status})`)
    const data = await res.json()
    if (gen !== xlsxFetchGen) return // 再次检查（json 解析后也可能有新的请求）
    xlsxHeaders.value = data.headers || []
    xlsxRows.value = data.rows || []
    xlsxTotal.value = data.total || 0
    xlsxPage.value = data.page || 1
    xlsxTotalPages.value = data.totalPages || 0
  } catch (e) {
    if (gen !== xlsxFetchGen) return // 过期错误也忽略
    xlsxError.value = '加载表格数据失败: ' + e.message
  } finally {
    if (gen === xlsxFetchGen) xlsxLoading.value = false
  }
}

// 是否为代理外部页面
const isProxy = computed(() => doc.value?.meta?.ext === 'proxy')

// 是否全宽展示（代理页面 / PDF / Excel 表格）
const isFullWidth = computed(() => {
  if (!doc.value) return false
  const ext = doc.value.meta.ext
  return ext === 'proxy' || ext === 'pdf' || ext === 'xlsx-html'
})

// 标题：去掉文件扩展名
const displayTitle = computed(() => {
  if (!doc.value) return ''
  const name = doc.value.meta.name
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
})

// 显示用扩展名：xlsx-html 时显示 XLSX，否则显示原始 ext
const displayExt = computed(() => {
  if (!doc.value) return ''
  return (doc.value.meta.originalExt || doc.value.meta.ext).toUpperCase()
})

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN')
}

/**
 * 根据路由参数加载文件
 */
async function loadFile(filePath) {
  if (!filePath) {
    error.value = '文件路径无效'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  doc.value = null
  // 重置 xlsx 分页状态
  xlsxHeaders.value = []
  xlsxRows.value = []
  xlsxTotal.value = 0
  xlsxPage.value = 1
  xlsxTotalPages.value = 0
  xlsxLoading.value = false
  xlsxError.value = null
  // 递增 fetch 生成计数器，丢弃任何正在进行的过期请求
  xlsxFetchGen++
  try {
    const data = await api.getFile(filePath)
    doc.value = data
    // xlsx 文件加载元数据后自动加载第 1 页数据
    if (data?.meta?.originalExt === 'xlsx') {
      goXlsxPage(1)
    }
  } catch (e) {
    error.value = '文件加载失败: ' + e.message
  } finally {
    loading.value = false
  }
}

// 监听路由参数变化（侧栏切换文件时重新加载）
watch(
  () => route.params.pathMatch,
  (newPath) => {
    loadFile(newPath || '')
  },
  { immediate: true }  // 首次进入也触发
)
</script>

<style scoped>
.doc-header {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color, #ddd);
}
.doc-header h1 { font-size: 22px; margin-bottom: 8px; }
.doc-meta { font-size: 13px; color: var(--text-secondary, #999); }
.download-link {
  display: inline-block; margin-left: 12px; padding: 2px 10px;
  background: var(--tag-bg, #e8f0fe); color: var(--color-accent, #1e6bb8);
  border-radius: 4px; text-decoration: none; font-size: 12px;
}
.download-link:hover { background: var(--tag-border, #c4d8f0); }

/* 全宽展示：铺满右侧（代理页面无内边距） */
.container-full {
  max-width: none !important;
  width: 100%;
  padding: 0 !important;
  margin: 0 !important;
}
/* PDF 全宽时保留适当内边距 */
.container-pdf {
  padding: 24px 16px !important;
}

/* ========== Excel 表格 ========== */
.xlsx-wrap {
  overflow-x: auto;
  max-width: 100%;
  padding: 4px 0;
}
.xlsx-wrap table {
  border-collapse: collapse;
  font-size: 13px;
  width: 100%;
  min-width: 600px;
  color: var(--text-body, #2c3e50);
}
.xlsx-wrap table th,
.xlsx-wrap table td {
  border: 1px solid var(--border-subtle, #e0e8f0);
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.xlsx-wrap table th {
  background: var(--bg-th, #1e3a5f);
  color: var(--color-th, #fff);
  font-weight: 600;
  font-size: 12px;
  position: sticky;
  top: 0;
  z-index: 1;
}
.xlsx-wrap table tr:nth-child(even) td {
  background: var(--bg-stripe, #f8fafc);
}
.xlsx-wrap table tr:hover td {
  background: var(--tag-bg, #e8f0fe);
}
.xlsx-row-num {
  color: var(--text-body, #999) !important;
  text-align: center !important;
  font-size: 11px !important;
  opacity: .6;
  width: 40px;
  min-width: 40px;
}

/* ========== Excel 分页信息栏 ========== */
.xlsx-info-bar {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 8px; font-size: 13px;
  color: var(--text-body, #2c3e50); flex-wrap: wrap;
}
.xlsx-info-text { opacity: .7; }
.xlsx-page-size {
  display: flex; align-items: center; gap: 4px;
  margin-left: auto; font-size: 13px;
}
.xlsx-page-size select {
  padding: 2px 6px; border: 1px solid var(--border-subtle, #ddd);
  border-radius: 4px; background: var(--card-bg, #fff);
  color: var(--text-body, #2c3e50); font-size: 12px;
  font-family: inherit; cursor: pointer;
}

/* ========== Excel 分页按钮 ========== */
.xlsx-pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; margin-top: 16px; padding: 12px 0; flex-wrap: wrap;
}
.xlsx-pagination button {
  padding: 6px 12px; border: 1px solid var(--border-subtle, #ddd);
  border-radius: 6px; background: var(--card-bg, #fff);
  color: var(--text-body, #2c3e50); cursor: pointer;
  font-size: 13px; font-family: inherit;
  transition: all .2s; white-space: nowrap;
}
.xlsx-pagination button:hover:not(:disabled) {
  border-color: var(--color-accent, #1e6bb8);
  color: var(--color-accent, #1e6bb8);
}
.xlsx-pagination button:disabled {
  opacity: .4; cursor: default;
}
.xlsx-pagination .xlsx-page-btn.active {
  background: var(--color-accent, #1e6bb8);
  color: #fff; border-color: var(--color-accent, #1e6bb8);
}
.xlsx-pagination .xlsx-page-btn {
  min-width: 36px; text-align: center;
}
.xlsx-ellipsis {
  padding: 6px 4px; font-size: 14px; color: var(--text-body, #2c3e50);
  letter-spacing: 2px; user-select: none; cursor: default;
}
</style>
