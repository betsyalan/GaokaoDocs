<template>
  <div class="external-viewer">
    <!-- 加载中 --><!-- 注意：iframe 必须在 v-if 之外始终渲染，否则 @load 不触发 -->
    <div v-if="loading" class="ev-loading">
      <span class="ev-spinner"></span>
      <span>正在加载外部页面...</span>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="error" class="ev-error">
      <span class="ev-error-icon">⚠</span>
      <div class="ev-error-text">
        <p>页面加载失败</p>
        <p class="ev-error-detail">{{ error }}</p>
        <a :href="sourceUrl" target="_blank" rel="noopener" class="ev-open-link">
          在新标签页中打开 →
        </a>
      </div>
    </div>

    <!-- 页面内容（始终渲染，用 CSS 控制显示） -->
    <div class="ev-content" :class="{ 'ev-hidden': loading || error }">
      <!-- 原始地址栏 -->
      <div class="ev-source-bar">
        <span class="ev-source-icon">🔗</span>
        <a :href="sourceUrl" target="_blank" rel="noopener" class="ev-source-link" :title="sourceUrl">
          {{ displayUrl }}
        </a>
      </div>

      <!-- 代理 iframe -->
      <iframe
        ref="iframeRef"
        :src="proxyUrl"
        class="ev-iframe"
        frameborder="0"
        @load="onLoad"
        @error="onIframeError"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  /** 外部页面 URL（如 https://zs.szu.edu.cn/...） */
  url: { type: String, required: true }
})

const loading = ref(true)
const error = ref(null)
const iframeRef = ref(null)

// 代理地址
const proxyUrl = computed(() => `/api/proxyPage?url=${encodeURIComponent(props.url)}`)
const sourceUrl = computed(() => props.url)

// 显示用 URL（去掉协议前缀，更简洁）
const displayUrl = computed(() => props.url.replace(/^https?:\/\//, ''))

function onLoad() {
  loading.value = false
}

function onIframeError() {
  loading.value = false
  error.value = '代理页面加载异常'
}
</script>

<style scoped>
.external-viewer {
  width: 100%;
  min-height: 500px;
  display: flex;
  flex-direction: column;
}

/* 加载态 */
.ev-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 0;
  color: var(--text-secondary, #999);
  font-size: 14px;
}
.ev-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-color, #eee);
  border-top-color: var(--accent-color, #1e6bb8);
  border-radius: 50%;
  animation: ev-spin 0.8s linear infinite;
}
@keyframes ev-spin {
  to { transform: rotate(360deg); }
}

/* 错误状态 */
.ev-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 0;
  color: var(--text-secondary, #999);
}
.ev-error-icon {
  font-size: 40px;
  opacity: 0.4;
}
.ev-error-text {
  text-align: center;
  font-size: 14px;
}
.ev-error-text p { margin: 4px 0; }
.ev-error-detail {
  font-size: 12px;
  opacity: 0.7;
}
.ev-open-link {
  display: inline-block;
  margin-top: 12px;
  padding: 6px 16px;
  background: var(--accent-color, #1e6bb8);
  color: #fff;
  border-radius: 6px;
  text-decoration: none;
  font-size: 13px;
  transition: opacity 0.2s;
}
.ev-open-link:hover {
  opacity: 0.85;
}

/* 内容容器（含地址栏 + iframe） */
.ev-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.ev-hidden {
  display: none;
}

/* 原始地址栏 */
.ev-source-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--card-bg, #fff);
  border-bottom: 1px solid var(--border-color, #eee);
  font-size: 12px;
  flex-shrink: 0;
}
.ev-source-icon {
  font-size: 12px;
  flex-shrink: 0;
}
.ev-source-link {
  color: var(--accent-color, #1e6bb8);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.2s;
}
.ev-source-link:hover {
  opacity: 0.75;
  text-decoration: underline;
}

/* iframe */
.ev-iframe {
  width: 100%;
  min-height: 80vh;
  border: none;
  flex: 1;
}
</style>
