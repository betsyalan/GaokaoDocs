<template>
  <div class="container">
    <h1 class="page-title">文档列表</h1>

    <!-- 类型筛选 -->
    <div class="filter-bar">
      <button
        v-for="t in types" :key="t.key"
        :class="['filter-btn', { active: activeType === t.key }]"
        @click="activeType = t.key; loadFiles()"
      >{{ t.label }}</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 空状态 -->
    <div v-else-if="files.length === 0" class="empty-state">
      <div class="icon">📂</div>
      <p>暂无文件</p>
    </div>

    <!-- 文件列表 -->
    <FileCard v-for="f in files" :key="f.path" :file="f" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import FileCard from '@/components/FileCard.vue'

const files = ref([])
const loading = ref(true)
const error = ref(null)
const activeType = ref('')

const types = [
  { key: '', label: '全部' },
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'pdf', label: 'PDF' },
  { key: 'xlsx', label: 'Excel' }
]

async function loadFiles() {
  loading.value = true
  error.value = null
  try {
    const data = await api.getFiles(activeType.value)
    files.value = data.files || []
  } catch {
    error.value = '加载文件列表失败'
  } finally {
    loading.value = false
  }
}

onMounted(loadFiles)
</script>

<style scoped>
.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-btn {
  padding: 6px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.filter-btn:hover { border-color: #1a73e8; color: #1a73e8; }
.filter-btn.active {
  background: #1a73e8;
  color: #fff;
  border-color: #1a73e8;
}
</style>
