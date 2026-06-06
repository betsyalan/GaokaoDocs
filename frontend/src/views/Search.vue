<template>
  <div class="container">
    <h1 class="page-title">全文搜索</h1>

    <div class="search-box">
      <input
        v-model="query"
        type="text"
        placeholder="输入关键词搜索文档..."
        @input="onSearch"
        class="search-input"
      />
    </div>

    <!-- 搜索中 -->
    <div v-if="loading" class="loading">搜索中...</div>

    <!-- 空结果 -->
    <div v-else-if="query && results.length === 0" class="empty-state">
      <div class="icon">🔍</div>
      <p>未找到匹配结果</p>
    </div>

    <!-- 搜索结果 -->
    <div v-else class="results">
      <div v-for="r in results" :key="r.file" class="result-item">
        <router-link :to="`/file/${r.file}`" class="result-title">
          {{ r.title || r.file }}
        </router-link>
        <div class="result-snippet" v-html="r.snippet"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { api } from '@/api'

const query = ref('')
const results = ref([])
const loading = ref(false)
let debounceTimer = null

function onSearch() {
  clearTimeout(debounceTimer)
  if (!query.value.trim()) {
    results.value = []
    return
  }
  // 300ms 防抖
  debounceTimer = setTimeout(async () => {
    loading.value = true
    try {
      const data = await api.search(query.value.trim())
      results.value = data.results || []
    } catch {
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}
</script>

<style scoped>
.search-box { margin-bottom: 24px; }
.search-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
}
.search-input:focus { border-color: #1a73e8; }
.result-item {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.result-title {
  font-size: 16px;
  font-weight: 500;
  color: #1a73e8;
}
.result-snippet {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
  line-height: 1.6;
}
.result-snippet :deep(b) { color: #e94560; }
</style>
