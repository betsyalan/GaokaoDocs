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
      <component :is="Search" :size="48" stroke-width="1.5" style="color:var(--text-secondary,#ccc);margin-bottom:12px" />
      <p>未找到匹配结果</p>
    </div>

    <!-- 搜索结果 -->
    <div v-else class="results">
      <div class="result-meta" v-if="total > 0">
        共 {{ total }} 条结果，第 {{ page }}/{{ totalPages }} 页
      </div>
      <div v-for="r in results" :key="r.file" class="result-item">
        <router-link :to="resultLink(r)" class="result-title">
          {{ r.title || r.file }}
        </router-link>
        <span class="result-type">{{ resultType(r) }}</span>
        <div class="result-snippet" v-if="r.snippet" v-html="r.snippet"></div>
      </div>

      <!-- 翻页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button :disabled="page <= 1" @click="goPage(page - 1)" class="page-btn">上一页</button>
        <button
          v-for="p in pageRange" :key="p"
          :class="['page-btn', { active: p === page }]"
          @click="goPage(p)"
        >{{ p }}</button>
        <button :disabled="page >= totalPages" @click="goPage(page + 1)" class="page-btn">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Search } from 'lucide-vue-next'
import { api } from '@/api'

const query = ref('')
const results = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const limit = 20
let debounceTimer = null

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

// 计算显示的页码按钮（最多9个，当前页居中）
const pageRange = computed(() => {
  const tp = totalPages.value
  const cp = page.value
  if (tp <= 9) return Array.from({ length: tp }, (_, i) => i + 1)
  let start = Math.max(1, cp - 4)
  let end = Math.min(tp, cp + 4)
  if (end - start < 8) {
    if (start === 1) end = start + 8
    else start = end - 8
  }
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
})

/**
 * 返回结果类型标签
 */
function resultType(r) {
  if (r.file.startsWith('gaokao:uni:')) return '大学'
  if (r.file.startsWith('gaokao:maj:')) return '专业'
  return r.file.split('.').pop().toUpperCase()
}

/**
 * 根据结果类型返回正确的导航链接
 * gaokao:uni:code → /gaokao/admission/code
 * gaokao:maj:code:major → /gaokao/admission/code
 * 普通文件 → /file/path
 */
function resultLink(r) {
  if (r.file.startsWith('gaokao:uni:') || r.file.startsWith('gaokao:maj:')) {
    const code = r.file.split(':')[2]
    return `/gaokao/admission/${code}`
  }
  return `/file/${r.file}`
}

async function doSearch() {
  if (!query.value.trim()) {
    results.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const data = await api.search(query.value.trim(), page.value)
    results.value = data.results || []
    total.value = data.total || 0
  } catch {
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doSearch, 300)
}

function goPage(p) {
  page.value = p
  doSearch()
}
</script>

<style scoped>
.search-box { margin-bottom: 24px; }
.search-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid var(--border-color, #ddd);
  border-radius: 8px;
  background: var(--card-bg, #fff);
  outline: none;
  transition: border-color 0.2s, background 0.3s;
}
.search-input:focus { border-color: var(--accent-color, #1a73e8); }
.result-item {
  background: var(--card-bg, #fff);
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  transition: background 0.3s, box-shadow 0.3s;
}
.result-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent-color, #1a73e8);
}
.result-snippet {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin-top: 8px;
  line-height: 1.6;
}
.result-snippet :deep(b) { color: #e94560; }
/* 结果统计 */
.result-meta {
  font-size: 13px;
  color: var(--text-secondary, #999);
  margin-bottom: 12px;
}

/* 翻页 */
.pagination {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 24px;
  flex-wrap: wrap;
}
.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 6px;
  background: var(--card-bg, #fff);
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary, #333);
  transition: all 0.15s;
}
.page-btn:hover:not(:disabled) {
  border-color: var(--accent-color, #1e6bb8);
  color: var(--accent-color, #1e6bb8);
}
.page-btn.active {
  background: var(--accent-color, #1e6bb8);
  color: #fff;
  border-color: var(--accent-color, #1e6bb8);
  font-weight: 600;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.result-type {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  background: color-mix(in srgb, var(--accent-color, #1e6bb8) 10%, transparent);
  color: var(--accent-color, #1e6bb8);
  border: 1px solid color-mix(in srgb, var(--accent-color, #1e6bb8) 20%, transparent);
  vertical-align: middle;
}
</style>
