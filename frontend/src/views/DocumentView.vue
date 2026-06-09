<template>
  <div class="container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 文档内容 -->
    <template v-else-if="doc">
      <div class="doc-header">
        <h1>{{ doc.meta.name }}</h1>
        <div class="doc-meta">
          {{ doc.meta.ext.toUpperCase() }} · {{ formatSize(doc.meta.size) }} · {{ formatDate(doc.meta.mtime) }}
        </div>
      </div>

      <!-- HTML 渲染 -->
      <IframeViewer v-if="doc.meta.ext === 'html'" :content="doc.content" />

      <!-- Markdown 渲染 -->
      <MdRenderer v-else-if="doc.meta.ext === 'md'" :content="doc.content" />

      <!-- PDF 渲染 -->
      <PdfViewer v-else-if="doc.meta.ext === 'pdf'" :url="`/docs/${doc.meta.name}`" />
    </template>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import IframeViewer from '@/components/IframeViewer.vue'
import MdRenderer from '@/components/MdRenderer.vue'
import PdfViewer from '@/components/PdfViewer.vue'

const route = useRoute()
const doc = ref(null)
const loading = ref(true)
const error = ref(null)

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
</style>
