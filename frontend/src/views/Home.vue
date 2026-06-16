<template>
  <div class="container">
    <h1 class="page-title">报考总览</h1>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 空状态 -->
    <div v-else-if="files.length === 0" class="empty-state">
      <component :is="FolderOpen" :size="48" stroke-width="1.5" style="color:var(--text-secondary,#ccc);margin-bottom:12px" />
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
          <span class="cat-header-count">{{ ci.isData && ci.key !== 'distribution' ? '' : catCounts[ci.key] + ' 个文件' }}</span>
          <span :class="['cat-toggle', { open: !collapsedCats.has(ci.key) }]">▾</span>
        </div>

        <!-- 文件分类 -->
        <template v-if="!ci.isData">
          <div v-if="!collapsedCats.has(ci.key)" class="cat-body">
            <FileCard v-for="f in groupedFiles[ci.key]" :key="f.path" :file="f" />
          </div>
        </template>

        <!-- 历年录取分（数据库 + admission 分类文件） -->
        <template v-else-if="ci.key === 'admission' && combinedAdmissionByProvince.length > 0">
          <div v-if="!collapsedCats.has(ci.key)" class="cat-body">
            <div v-for="prov in combinedAdmissionByProvince" :key="prov.province" class="province-group">
              <div class="province-header" @click.stop="toggleProvince(prov.province)">
                <span class="province-label">{{ prov.province }}</span>
                <span class="province-count">{{ prov.universities.length }} 所</span>
                <span :class="['cat-toggle', { open: !collapsedProvince.has(prov.province) }]">▾</span>
              </div>
              <div v-if="!collapsedProvince.has(prov.province)" class="uni-list">
                <!-- 数据库大学条目 -->
                <router-link
                  v-for="u in prov.universities" :key="u.code || u.path"
                  :to="u._isFile ? `/file/${u.path}` : `/gaokao/admission/${u.code}`"
                  class="uni-card"
                >
                  <span class="uni-icon">
                    <component :is="u._isFile ? Image : GraduationCap" :size="20" stroke-width="1.5" />
                  </span>
                  <span class="uni-name">{{ u.name }}</span>
                  <template v-if="!u._isFile">
                    <span class="uni-tags">
                      <span v-for="tag in u.tags" :key="tag" class="tag-badge">{{ tag }}</span>
                    </span>
                  </template>
                  <span class="uni-arrow">→</span>
                </router-link>
              </div>
            </div>
          </div>
        </template>

        <!-- 一分一段表（数据库 + 文件） -->
        <template v-else-if="ci.key === 'distribution'">
          <div v-if="!collapsedCats.has(ci.key)" class="cat-body">
            <!-- 数据库入口 -->
            <router-link to="/gaokao/distribution" class="dist-card">
              <span class="dist-icon"><component :is="BarChart4" :size="28" stroke-width="1.5" /></span>
              <div class="dist-info">
                <div class="dist-title">广东省 2025 物理类一分一段表</div>
                <div class="dist-meta">597 条记录 · 点击查看 →</div>
              </div>
            </router-link>
            <!-- 分类下的 PDF 文件 -->
            <FileCard v-for="f in groupedFiles['distribution']" :key="f.path" :file="f" />
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'
import FileCard from '@/components/FileCard.vue'
import { BookOpen, GraduationCap, Target, BarChart3, Globe, ScrollText, BarChart4, FolderOpen, Image } from 'lucide-vue-next'

const files = ref([])
const loading = ref(true)
const error = ref(null)
const activeCat = ref('')
const collapsedCats = ref(new Set())

// 分类定义，使用 Lucide 图标组件
const categoryDefs = {
  major:      { key: 'major',      icon: BookOpen,      label: '专业信息', color: '#0d9488' },
  university: { key: 'university', icon: GraduationCap, label: '大学信息', color: '#1e6bb8' },
  guide:      { key: 'guide',      icon: Target,        label: '报考指南', color: '#c94f2b' },
  data:       { key: 'data',       icon: BarChart3,     label: '志愿数据', color: '#7c4d9e' },
  admission:  { key: 'admission',  icon: ScrollText,    label: '历年录取分', color: '#2563eb', isData: true },
  distribution: { key: 'distribution', icon: BarChart4, label: '一分一段表', color: '#0891b2', isData: true },
  page:       { key: 'page',       icon: Globe,         label: '其他页面', color: '#6b7280' },
}

// 分类展示顺序
const catOrder = [categoryDefs.major, categoryDefs.admission, categoryDefs.university,
                  categoryDefs.guide, categoryDefs.data,
                  categoryDefs.distribution, categoryDefs.page]

// 历年录取分的大学列表（按省份分组）
const universitiesByProvince = ref([])
const collapsedProvince = ref(new Set())

// 合并数据库大学 + admission 分类文件，按省份分组
const combinedAdmissionByProvince = computed(() => {
  const merged = JSON.parse(JSON.stringify(universitiesByProvince.value))
  const admissionFiles = files.value.filter(f => f.category === 'admission' && f.province)
  for (const file of admissionFiles) {
    const dot = file.name.lastIndexOf('.')
    const displayName = dot > 0 ? file.name.slice(0, dot) : file.name
    let provGroup = merged.find(p => p.province === file.province)
    if (!provGroup) {
      provGroup = { province: file.province, universities: [] }
      merged.push(provGroup)
    }
    provGroup.universities.push({
      _isFile: true,
      name: displayName,
      path: file.path,
      ext: file.ext
    })
  }
  return merged
})

function toggleProvince(province) {
  const s = new Set(collapsedProvince.value)
  if (s.has(province)) s.delete(province); else s.add(province)
  collapsedProvince.value = s
}

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

// 各类别文件数（数据分类使用大学总数）
const catCounts = computed(() => {
  const counts = {}
  for (const [cat, list] of Object.entries(groupedFiles.value)) {
    counts[cat] = list.length
  }
  counts.admission = combinedAdmissionByProvince.value.reduce((s, p) => s + p.universities.length, 0)
  counts.distribution = 1 + (groupedFiles.value['distribution']?.length || 0)
  return counts
})

// 当前可见的分类（数据分类始终显示）
const visibleCats = computed(() => {
  const showAll = !activeCat.value
  return catOrder.filter(ci => {
    if (ci.isData) {
      return showAll || activeCat.value === ci.key
    }
    return showAll
      ? catCounts.value[ci.key] > 0
      : activeCat.value === ci.key && catCounts.value[ci.key] > 0
  })
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
    const data = await api.getFiles('')
    files.value = data.files || []
  } catch {
    error.value = '加载文件列表失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadFiles()
  loadUniversities()
})

async function loadUniversities() {
  try {
    const data = await api.getGaokaoUniversities()
    universitiesByProvince.value = data.provinces || []
  } catch {
    universitiesByProvince.value = []
  }
}
</script>

<style scoped>
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
  background: var(--accent-color, #666) !important;
  border-color: var(--accent-color, #666) !important;
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

/* ========== 省份分组 ========== */
.province-group {
  margin-bottom: 4px;
}
.province-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  color: var(--text-secondary, #666);
  border-radius: 4px;
  transition: background 0.15s;
}
.province-header:hover {
  background: var(--body-bg, #f5f5f5);
}
.province-label {
  font-weight: 600;
  color: var(--text-primary, #333);
}
.province-count {
  font-size: 11px;
  color: var(--text-secondary, #999);
  margin-left: auto;
}

/* ========== 大学卡片 ========== */
.uni-list {
  padding-left: 12px;
}
.uni-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 6px;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.06));
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s;
}
.uni-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.uni-icon {
  display: flex;
  align-items: center;
  color: var(--accent-color, #1e6bb8);
  flex-shrink: 0;
}
.uni-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #333);
}
.uni-tags {
  display: flex;
  gap: 4px;
}
.tag-badge {
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  background: color-mix(in srgb, var(--accent-color, #1e6bb8) 10%, transparent);
  color: var(--accent-color, #1e6bb8);
  border: 1px solid color-mix(in srgb, var(--accent-color, #1e6bb8) 25%, transparent);
}
.uni-arrow {
  font-size: 14px;
  color: var(--text-secondary, #bbb);
  flex-shrink: 0;
}

/* ========== 一分一段表入口卡片 ========== */
.dist-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.06));
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.2s;
}
.dist-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}
.dist-icon {
  display: flex;
  align-items: center;
  color: var(--accent-color, #0891b2);
  flex-shrink: 0;
}
.dist-info {
  flex: 1;
}
.dist-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #333);
}
.dist-meta {
  font-size: 13px;
  color: var(--text-secondary, #999);
  margin-top: 4px;
}
</style>
