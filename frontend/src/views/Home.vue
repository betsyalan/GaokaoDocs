<template>
  <div class="container">
    <h1 class="page-title">文档概览</h1>

    <!-- 文件类型筛选（细类） -->
    <div class="type-bar">
      <button
        v-for="t in types" :key="t.key"
        :class="['type-btn', { active: activeType === t.key }]"
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

    <!-- 分类标签栏 -->
    <template v-else>
      <div class="cat-bar">
        <button
          :class="['cat-btn', { active: activeCat === '' }]"
          @click="activeCat = ''"
        >全部 <span class="cat-count">{{ files.length }}</span></button>
        <button
          v-for="ci in catOrder" :key="ci.key"
          :class="['cat-btn', { active: activeCat === ci.key }]"
          :style="activeCat === ci.key ? { background: ci.color, borderColor: ci.color } : {}"
          @click="activeCat = ci.key; scrollToCat(ci.key)"
        >
          <component :is="ci.icon" :size="14" stroke-width="1.5" />
          {{ ci.label }}
          <span class="cat-count">{{ catCounts[ci.key] || 0 }}</span>
        </button>
      </div>

      <!-- 分类分组内容 -->
      <div v-for="ci in visibleCats" :key="ci.key" class="cat-section">
        <div class="cat-header" @click="toggleCat(ci.key)">
          <component :is="ci.icon" :size="20" stroke-width="1.5" class="cat-header-icon" />
          <span class="cat-header-label">{{ ci.label }}</span>
          <span class="cat-header-count">{{ catCounts[ci.key] }} 个文件</span>
          <span :class="['cat-toggle', { open: !collapsedCats.has(ci.key) }]">▾</span>
        </div>
        <div v-if="!collapsedCats.has(ci.key)" class="cat-body">
          <FileCard v-for="f in groupedFiles[ci.key]" :key="f.path" :file="f" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import FileCard from '@/components/FileCard.vue'
import { BookOpen, GraduationCap, Target, BarChart3, FileText, Globe } from 'lucide-vue-next'

const files = ref([])
const loading = ref(true)
const error = ref(null)
const activeType = ref('')
const activeCat = ref('')
const collapsedCats = ref(new Set())

const types = [
  { key: '', label: '全部类型' },
  { key: 'md', label: 'Markdown' },
  { key: 'html', label: 'HTML' },
  { key: 'pdf', label: 'PDF' },
  { key: 'xlsx', label: 'Excel' },
]

// 分类定义，使用 Lucide 图标组件
const categoryDefs = {
  major:      { key: 'major',      icon: BookOpen,      label: '专业信息', color: '#0d9488' },
  university: { key: 'university', icon: GraduationCap, label: '大学信息', color: '#1e6bb8' },
  guide:      { key: 'guide',      icon: Target,        label: '报考指南', color: '#c94f2b' },
  data:       { key: 'data',       icon: BarChart3,     label: '志愿数据', color: '#7c4d9e' },
  reference:  { key: 'reference',  icon: FileText,      label: '参考资料', color: '#8b7355' },
  page:       { key: 'page',       icon: Globe,         label: '其他页面', color: '#6b7280' },
}

// 分类展示顺序
const catOrder = [categoryDefs.major, categoryDefs.university, categoryDefs.guide,
                  categoryDefs.data, categoryDefs.reference, categoryDefs.page]

// 按分类分组文件
const groupedFiles = computed(() => {
  const groups = {}
  for (const f of files.value) {
    const cat = f.category || 'page'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(f)
  }
  return groups
})

// 各类别文件数
const catCounts = computed(() => {
  const counts = {}
  for (const [cat, list] of Object.entries(groupedFiles.value)) {
    counts[cat] = list.length
  }
  return counts
})

// 当前可见的分类（按 catOrder 排序，filter 只显示有文件的或全部模式）
const visibleCats = computed(() => {
  return activeCat.value
    ? catOrder.filter(ci => ci.key === activeCat.value && catCounts.value[ci.key])
    : catOrder.filter(ci => catCounts.value[ci.key])
})

// 收起/展开分类
function toggleCat(key) {
  const s = new Set(collapsedCats.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsedCats.value = s
}

// 滚动到指定分类
function scrollToCat(key) {
  setTimeout(() => {
    const el = document.getElementById('cat-' + key)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, 100)
}

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
/* 类型筛选 */
.type-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.type-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 20px;
  background: var(--card-bg, #fff);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s, background 0.3s, border-color 0.3s;
}
.type-btn:hover { border-color: var(--accent-color, #1a73e8); color: var(--accent-color, #1a73e8); }
.type-btn.active { background: var(--accent-color, #1a73e8); color: #fff; border-color: var(--accent-color, #1a73e8); }

/* 分类标签栏 */
.cat-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #eee);
}
.cat-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary, #666);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.cat-btn:hover {
  border-color: var(--border-color, #ddd);
  color: var(--text-primary, #333);
  background: var(--card-bg, #fff);
}
.cat-btn.active {
  color: #fff !important;
}
.cat-count {
  font-size: 11px;
  opacity: 0.7;
  margin-left: 2px;
}

/* 分类区域 */
.cat-section {
  margin-bottom: 20px;
}
.cat-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  cursor: pointer;
  user-select: none;
  border-radius: 6px;
  transition: background 0.15s;
}
.cat-header:hover {
  background: var(--body-bg, #f5f5f5);
}
.cat-header-icon {
  display: flex;
  align-items: center;
  color: var(--text-primary, #333);
}
.cat-header-label {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}
.cat-header-count {
  font-size: 12px;
  color: var(--text-secondary, #999);
  margin-left: auto;
}
.cat-toggle {
  font-size: 14px;
  color: var(--text-secondary, #999);
  transition: transform 0.2s;
  margin-left: 8px;
}
.cat-toggle.open {
  transform: rotate(0deg);
}
.cat-toggle:not(.open) {
  transform: rotate(-90deg);
}
.cat-body {
  padding-left: 4px;
}
</style>
