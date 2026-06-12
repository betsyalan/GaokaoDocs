<template>
  <aside class="file-sidebar" :class="{ open: open }">
    <!-- 头部：徽标 + 关闭 -->
    <div class="sidebar-header">
      <router-link to="/" class="sidebar-logo" @click="$emit('close')">
  <component :is="BookOpen" :size="18" stroke-width="1.5" style="vertical-align:middle;margin-right:6px" /> 高考智囊
</router-link>
      <button class="sidebar-close" @click="$emit('close')" title="收起侧栏">✕</button>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="sidebar-loading">
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
      <span class="loading-dot"></span>
    </div>

    <!-- 错误 -->
    <div v-else-if="error" class="sidebar-error">
      <component :is="AlertTriangle" :size="20" stroke-width="1.5" />
      <span>{{ error }}</span>
      <button class="retry-btn" @click="loadFiles">重试</button>
    </div>

    <!-- 空状态：无文件且无数据时显示 -->
    <div v-else-if="files.length === 0 && universitiesByProvince.length === 0" class="sidebar-empty">
      <component :is="FolderOpen" :size="32" stroke-width="1.5" style="color:var(--sidebar-text-secondary,rgba(255,255,255,0.35));margin-bottom:8px" />
      <p>暂无文件</p>
    </div>

    <!-- 文件列表 -->
    <nav class="sidebar-files">
      <div v-for="ci in catOrder" :key="ci.key" class="sidebar-cat-group">
        <!-- 文件分类（有文件才显示） -->
        <template v-if="!ci.isData">
          <div v-if="groupedFiles[ci.key]?.length" class="sidebar-cat-header" @click="toggleCat(ci.key)">
            <component :is="ci.icon" :size="14" stroke-width="1.5" />
            <span class="sidebar-cat-label">{{ ci.label }}</span>
            <span class="sidebar-cat-count">{{ groupedFiles[ci.key].length }}</span>
            <span :class="['sidebar-cat-toggle', { open: !collapsedCats.has(ci.key) }]">▾</span>
          </div>
          <div v-if="!collapsedCats.has(ci.key)">
            <router-link
              v-for="f in groupedFiles[ci.key]" :key="f.path"
              :to="f.ext === 'xlsx' ? '/volunteer' : `/file/${f.path}`"
              :class="['file-item', { active: isActiveFile(f.path) }]"
              @click="onFileClick"
            >
              <span class="file-icon"><component :is="iconMap[f.ext] || File" :size="16" stroke-width="1.5" /></span>
              <span class="file-name" :title="f.name">{{ f.name }}</span>
            </router-link>
          </div>
        </template>

        <!-- 历年录取分（数据库驱动 + admission 分类文件） -->
        <template v-else-if="ci.key === 'admission' && combinedAdmissionByProvince.length > 0">
          <div class="sidebar-cat-header" @click="toggleCat('admission')">
            <component :is="ci.icon" :size="14" stroke-width="1.5" />
            <span class="sidebar-cat-label">{{ ci.label }}</span>
            <span class="sidebar-cat-count">
              {{ combinedAdmissionByProvince.reduce((s, p) => s + p.universities.length, 0) }}
            </span>
            <span :class="['sidebar-cat-toggle', { open: !collapsedCats.has('admission') }]">▾</span>
          </div>
          <div v-if="!collapsedCats.has('admission')">
            <div v-for="prov in combinedAdmissionByProvince" :key="prov.province" class="sidebar-cat-group">
              <div class="sidebar-province-header" @click.stop="toggleProvince(prov.province)">
                <span class="province-name">{{ prov.province }}</span>
                <span class="sidebar-cat-count">{{ prov.universities.length }}</span>
                <span :class="['sidebar-cat-toggle', { open: !collapsedProvince.has(prov.province) }]">▾</span>
              </div>
              <div v-if="!collapsedProvince.has(prov.province)">
                <router-link
                  v-for="u in prov.universities" :key="u.code || u.path"
                  :to="u._isFile ? `/file/${u.path}` : `/gaokao/admission/${u.code}`"
                  :class="['file-item', { active: u._isFile ? isActiveFile(u.path) : activeUniCode === u.code }]"
                  @click="onFileClick"
                >
                  <span class="file-icon">{{ '' }}</span>
                  <span class="file-name" :title="u.name">{{ u.name }}</span>
                </router-link>
              </div>
            </div>
          </div>
        </template>

        <!-- 一分一段表（数据库驱动） -->
        <template v-else-if="ci.key === 'distribution'">
          <router-link
            to="/gaokao/distribution"
            :class="['file-item', { active: $route.path === '/gaokao/distribution' }]"
            @click="onFileClick"
          >
            <span class="file-icon">
              <component :is="ci.icon" :size="16" stroke-width="1.5" />
            </span>
            <span class="file-name">{{ ci.label }}</span>
          </router-link>
        </template>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import { BookOpen, GraduationCap, Target, BarChart3, Globe, FilePen, Code2, BookMarked, Table, File, ScrollText, BarChart4, AlertTriangle, FolderOpen, Image } from 'lucide-vue-next'
defineProps({
  open: { type: Boolean, default: false }
})
const emit = defineEmits(['close'])

const route = useRoute()
const files = ref([])
const loading = ref(true)
const error = ref(null)
const collapsedCats = ref(new Set())

const iconMap = { html: Code2, md: FilePen, pdf: BookMarked, xlsx: Table, png: Image, jpg: Image, jpeg: Image, gif: Image, webp: Image, svg: Image }

// 历年录取分的大学列表（按省份分组）
const universitiesByProvince = ref([])
const collapsedProvince = ref(new Set())

// 当前激活的大学（高亮用）
const activeUniCode = computed(() => route.params.code || null)

// 合并数据库大学 + admission 分类文件，按省份分组
const combinedAdmissionByProvince = computed(() => {
  const merged = JSON.parse(JSON.stringify(universitiesByProvince.value))
  const admissionFiles = files.value.filter(f => f.category === 'admission' && f.province)
  for (const file of admissionFiles) {
    // 去掉扩展名作为显示名
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

// 分类定义（专业信息放第一组），使用 Lucide 图标组件
const catOrder = [
  { key: 'major',      icon: BookOpen,      label: '专业信息' },
  { key: 'university', icon: GraduationCap, label: '大学信息' },
  { key: 'guide',      icon: Target,        label: '报考指南' },
  { key: 'data',       icon: BarChart3,     label: '志愿数据' },
  { key: 'admission',  icon: ScrollText,    label: '历年录取分', isData: true },
  { key: 'distribution', icon: BarChart4,   label: '一分一段表', isData: true },
  { key: 'page',       icon: Globe,         label: '其他页面' },
]

// 按分类分组
const groupedFiles = computed(() => {
  const groups = {}
  for (const f of files.value) {
    const cat = f.category || 'page'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(f)
  }
  return groups
})

function toggleCat(key) {
  const s = new Set(collapsedCats.value)
  if (s.has(key)) s.delete(key); else s.add(key)
  collapsedCats.value = s
}

function isActiveFile(filePath) {
  const currentPath = route.params.pathMatch
  return currentPath === filePath
}

// 移动端点击文件时自动收起侧栏，桌面端保持打开
function onFileClick() {
  if (window.innerWidth <= 768) {
    emit('close')
  }
}

async function loadFiles() {
  loading.value = true
  error.value = null
  try {
    const data = await api.getFiles('')
    files.value = data.files || []
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

async function loadUniversities() {
  try {
    const data = await api.getGaokaoUniversities()
    universitiesByProvince.value = data.provinces || []
  } catch {
    // 静默失败，分类直接不展示
    universitiesByProvince.value = []
  }
}

function toggleProvince(province) {
  const s = new Set(collapsedProvince.value)
  if (s.has(province)) s.delete(province); else s.add(province)
  collapsedProvince.value = s
}

onMounted(() => {
  loadFiles()
  loadUniversities()
})

</script>

<style scoped>
.file-sidebar {
  position: fixed;
  top: 56px;
  left: 0;
  width: 280px;
  height: calc(100vh - 56px);
  background: var(--sidebar-bg, #1a1a2e);
  display: flex;
  flex-direction: column;
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;
  box-shadow: 2px 0 12px rgba(0,0,0,0.08);
}

/* 桌面端默认展开 */
@media (min-width: 769px) {
  .file-sidebar {
    position: static;
    width: 260px;
    min-width: 260px;
    transform: none;
    box-shadow: none;
    border-right: 1px solid var(--sidebar-border, rgba(255,255,255,0.06));
  }
  .file-sidebar:not(.open) {
    display: none;
  }
  .sidebar-close { display: none; }
}

/* 窄屏：抽屉式滑入 */
@media (max-width: 768px) {
  .file-sidebar.open {
    transform: translateX(0);
  }
}

/* 头部 */
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--sidebar-border, rgba(255,255,255,0.06));
}
.sidebar-logo {
  font-size: 16px;
  font-weight: 700;
  color: var(--sidebar-accent, #e94560);
  text-decoration: none;
  letter-spacing: 0.5px;
}
.sidebar-close {
  background: none;
  border: none;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.4));
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}
.sidebar-close:hover { color: var(--sidebar-text, #fff); }

/* 筛选栏 */
/* 加载中动画 */
.sidebar-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sidebar-text-secondary, rgba(255,255,255,0.2));
  animation: pulse 1.4s infinite ease-in-out;
}
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 0.8; transform: scale(1); }
}

/* 错误 */
.sidebar-error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.4));
  font-size: 12px;
}
.retry-btn {
  padding: 4px 16px;
  border: 1px solid var(--sidebar-border, rgba(255,255,255,0.2));
  border-radius: 4px;
  background: transparent;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.5));
  cursor: pointer;
  font-size: 12px;
}
.retry-btn:hover {
  color: var(--sidebar-text, #fff);
  border-color: var(--sidebar-accent, rgba(255,255,255,0.4));
}

/* 空状态 */
.sidebar-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.35));
  font-size: 13px;
}
.empty-icon { font-size: 32px; }

/* 文件列表 */
.sidebar-files {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.sidebar-files::-webkit-scrollbar { width: 4px; }
.sidebar-files::-webkit-scrollbar-track { background: transparent; }
.sidebar-files::-webkit-scrollbar-thumb {
  background: var(--sidebar-border, rgba(255,255,255,0.1));
  border-radius: 2px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  color: var(--sidebar-text, rgba(255,255,255,0.6));
  text-decoration: none;
  font-size: 13px;
  line-height: 1.4;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}
.file-item:hover {
  color: var(--sidebar-text, #fff);
  background: var(--sidebar-hover-bg, rgba(255,255,255,0.05));
}
.file-item.active {
  color: var(--sidebar-accent, #fff);
  background: var(--sidebar-active-bg, rgba(233,69,96,0.12));
  border-left-color: var(--sidebar-accent, #e94560);
}
.file-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: 20px;
  justify-content: center;
  color: var(--sidebar-text-secondary, inherit);
}
.file-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 省份分组标题 */
.sidebar-province-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px 4px 24px;
  font-size: 12px;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.35));
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}
.sidebar-province-header:hover {
  color: var(--sidebar-text, rgba(255,255,255,0.6));
}
.province-name {
  flex: 1;
  font-size: 11px;
}

/* 分类分组 */
.sidebar-cat-group {
  margin-bottom: 2px;
}
.sidebar-cat-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px 4px;
  font-size: 12px;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.35));
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
}
.sidebar-cat-header:hover {
  color: var(--sidebar-text, rgba(255,255,255,0.6));
}
.sidebar-cat-label {
  flex: 1;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.sidebar-cat-count {
  font-size: 10px;
  opacity: 0.6;
}
.sidebar-cat-toggle {
  font-size: 10px;
  transition: transform 0.2s;
}
.sidebar-cat-toggle.open {
  transform: rotate(0deg);
}
.sidebar-cat-toggle:not(.open) {
  transform: rotate(-90deg);
}
</style>
