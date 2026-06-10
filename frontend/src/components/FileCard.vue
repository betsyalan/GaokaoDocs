<template>
  <router-link :to="file.ext === 'xlsx' ? '/volunteer' : `/file/${file.path}`" class="file-card">
    <span class="file-icon"><component :is="iconMap[file.ext] || File" :size="24" stroke-width="1.5" /></span>
    <div class="file-info">
      <div class="file-name">{{ file.name }}</div>
      <div class="file-meta">
        {{ file.ext.toUpperCase() }} · {{ formatSize(file.size) }} · {{ formatDate(file.mtime) }}
      </div>
    </div>
    <span class="cat-badge" :style="{ background: catColor }">{{ catLabel }}</span>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { FilePen, Code2, BookMarked, Table, File } from 'lucide-vue-next'

const props = defineProps({ file: Object })

const iconMap = { html: Code2, md: FilePen, pdf: BookMarked, xlsx: Table }

// 分类显示配置
const catConfig = {
  university: { label: '大学', color: '#1e6bb8' },
  major:      { label: '专业', color: '#0d9488' },
  guide:      { label: '报考', color: '#c94f2b' },
  data:       { label: '数据', color: '#7c4d9e' },
  page:       { label: '页面', color: '#6b7280' },
}

const catLabel = computed(() => catConfig[props.file.category]?.label || '')
const catColor = computed(() => catConfig[props.file.category]?.color || '#999')

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
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  text-decoration: none;
  color: inherit;
  margin-bottom: 8px;
  transition: box-shadow 0.2s, background 0.3s;
  position: relative;
}
.file-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  text-decoration: none;
}
.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  flex-shrink: 0;
  color: var(--text-secondary, #999);
}
.file-name { font-size: 16px; font-weight: 500; }
.file-meta { font-size: 12px; color: var(--text-secondary, #999); margin-top: 4px; }

/* 分类徽标 */
.cat-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #fff;
  font-weight: 500;
  letter-spacing: 0.3px;
  opacity: 0.85;
}
</style>
