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
          {{ doc.meta.ext.toUpperCase() }} · {{ formatSize(doc.meta.size) }} · {{ formatDate(doc.meta.mtime) }}
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

// 是否为代理外部页面
const isProxy = computed(() => doc.value?.meta?.ext === 'proxy')

// 是否全宽展示（代理页面 / PDF）
const isFullWidth = computed(() => {
  if (!doc.value) return false
  const ext = doc.value.meta.ext
  return ext === 'proxy' || ext === 'pdf'
})

// 标题：去掉文件扩展名
const displayTitle = computed(() => {
  if (!doc.value) return ''
  const name = doc.value.meta.name
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
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
  try {
    const data = await api.getFile(filePath)
    doc.value = data
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
</style>
