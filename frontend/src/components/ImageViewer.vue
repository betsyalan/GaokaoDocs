<template>
  <div class="image-viewer">
    <!-- 加载中 -->  <!-- 注意：<img> 必须在 v-if 之外始终渲染，
         否则 @load/@error 永远不会触发，导致死循环转圈 -->
    <div v-if="loading" class="iv-loading">
      <span class="iv-spinner"></span>
      <span>加载中...</span>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="iv-error">
      <span class="iv-error-icon">⚠</span>
      <span>{{ error }}</span>
    </div>

    <!-- 图片（始终在 DOM 中，以保证 @load/@error 能正常触发） -->
    <div class="iv-image-area" :class="{ 'iv-hidden': loading || error }">
      <div class="iv-image-wrap">
        <a :href="imageUrl" target="_blank" rel="noopener" class="iv-image-link">
          <img
            :src="imageUrl"
            :alt="fileName"
            class="iv-image"
            @load="onLoad"
            @error="onImgError"
          />
        </a>
      </div>
      <!-- 图片元信息 -->
      <div class="iv-meta">
        <template v-if="meta">
          {{ formatSize(meta.size) }}
          <template v-if="naturalSize">
             · {{ naturalSize.width }} × {{ naturalSize.height }}
          </template>
          <template v-if="meta.mtime">
             · {{ formatDate(meta.mtime) }}
          </template>
        </template>
        <span class="iv-tip">（点击图片在新标签中查看原图）</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** 文件名，如 "东北大学.png" */
  filePath: { type: String, required: true },
  /** 文件元信息（可选），含 size / mtime */
  meta: { type: Object, default: null }
})

const loading = ref(true)
const error = ref(null)
const naturalSize = ref(null)

// 图片静态路由
const imageUrl = computed(() => `/docs/${props.filePath}`)
const fileName = computed(() => props.filePath)

/** 图片加载成功：记录原始尺寸，关闭加载态 */
function onLoad(e) {
  loading.value = false
  const img = e.target
  naturalSize.value = { width: img.naturalWidth, height: img.naturalHeight }
}

/** 图片加载失败：显示错误提示 */
function onImgError() {
  loading.value = false
  error.value = '图片加载失败'
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.image-viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
}

/* 加载态 */
.iv-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-secondary, #999);
  font-size: 14px;
}
.iv-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #eee);
  border-top-color: var(--accent-color, #1e6bb8);
  border-radius: 50%;
  animation: iv-spin 0.8s linear infinite;
}
@keyframes iv-spin {
  to { transform: rotate(360deg); }
}

/* 隐藏尚未加载/已失败的图片区域 */
.iv-hidden {
  display: none;
}

/* 错误状态 */
.iv-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 0;
  color: var(--text-secondary, #999);
  font-size: 14px;
}
.iv-error-icon {
  font-size: 32px;
  opacity: 0.5;
}

/* 图片容器 */
.iv-image-wrap {
  display: flex;
  justify-content: center;
  max-width: 100%;
}
.iv-image-link {
  display: inline-flex;
  cursor: zoom-in;
  transition: box-shadow 0.2s;
  border-radius: 8px;
}
.iv-image-link:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.iv-image {
  max-width: 100%;
  max-height: 80vh;
  height: auto;
  border-radius: 8px;
  object-fit: contain;
  background: #fafafa;
}

/* 元信息 */
.iv-meta {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-secondary, #999);
  text-align: center;
}
.iv-tip {
  opacity: 0.6;
  margin-left: 8px;
}
</style>
