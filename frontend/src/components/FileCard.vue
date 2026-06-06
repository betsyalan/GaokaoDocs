<template>
  <router-link :to="`/file/${file.path}`" class="file-card">
    <span class="file-icon">{{ iconMap[file.ext] || '📄' }}</span>
    <div class="file-info">
      <div class="file-name">{{ file.name }}</div>
      <div class="file-meta">
        {{ file.ext.toUpperCase() }} · {{ formatSize(file.size) }} · {{ formatDate(file.mtime) }}
      </div>
    </div>
  </router-link>
</template>

<script setup>
defineProps({ file: Object })

const iconMap = { html: '🌐', md: '📝', pdf: '📕' }

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.file-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  text-decoration: none;
  color: inherit;
  margin-bottom: 8px;
  transition: box-shadow 0.2s;
}
.file-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  text-decoration: none;
}
.file-icon { font-size: 28px; }
.file-name { font-size: 16px; font-weight: 500; }
.file-meta { font-size: 12px; color: #999; margin-top: 4px; }
</style>
