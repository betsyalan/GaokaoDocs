<template>
  <div class="volunteer-container" :class="`theme-${currentTheme}`">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">📊 加载志愿表数据...</div>
    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>
    <!-- 空 -->
    <div v-else-if="!data" class="empty-state"><div class="icon">📂</div><p>暂无志愿表数据</p></div>

    <template v-else>
      <header class="vol-header"><h1>📋 高考志愿表预览</h1></header>

      <!-- 文件选择器：每个 Excel 文件独立一页 -->
      <div class="file-bar">
        <button v-for="(d, key) in data" :key="key"
          :class="['file-btn', { active: activeTab === key }]"
          @click="switchFile(key)">
          <span class="file-btn-dot">{{ activeTab === key ? '📄' : '📋' }}</span>
          <span class="file-btn-label">{{ fileDisplayLabel(d.meta, key) }}</span>
          <span class="file-btn-badge">{{ d.groups.length }} 组</span>
        </button>
      </div>

      <!-- 元信息 -->
      <div class="page-meta" v-if="currentData">
        <span class="meta-chip">📍 {{ currentData.meta.province }}</span>
        <span class="meta-chip">🎯 {{ currentData.meta.level }} · {{ currentData.meta.score }}</span>
        <span class="meta-chip">📚 {{ currentData.meta.subjects }}</span>
      </div>

      <!-- 统计摘要 -->
      <div class="summary-bar" v-if="currentData">
        <div class="summary-item"><span class="num">{{ currentData.groups.length }}</span><span>院校组</span></div>
        <div class="summary-item"><span class="num">{{ totalMajors }}</span><span>专业</span></div>
        <div class="summary-item" style="border-left:2px solid var(--prob-high-color)">
          <span class="num" style="color:var(--prob-high-color)">{{ highCount }}</span><span>保底</span>
        </div>
        <div class="summary-item" style="border-left:2px solid var(--prob-mid-color)">
          <span class="num" style="color:var(--prob-mid-color)">{{ midCount }}</span><span>稳妥</span>
        </div>
        <div class="summary-item" style="border-left:2px solid var(--prob-low-color)">
          <span class="num" style="color:var(--prob-low-color)">{{ lowCount }}</span><span>冲刺</span>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="filter-bar" v-if="currentData">
        <span class="filter-bar-label">筛选：</span>
        <button v-for="f in filterOptions" :key="f.key"
          :class="['filter-btn', { active: activeFilter === f.key }]"
          :disabled="f.count === 0"
          @click="activeFilter = f.key">
          {{ f.label }}<span class="count">{{ f.count }}</span>
        </button>
        <div class="search-box">
          <input type="text" placeholder="搜索院校或专业..." v-model="searchQuery">
        </div>
      </div>

      <!-- 卡片 -->
      <div class="card-list" v-if="currentData">
        <div v-if="filteredGroups.length === 0" class="empty-state">🔍 没有匹配的院校，请调整筛选条件</div>

        <div v-for="g in filteredGroups" :key="g.group_num" class="school-card">
          <div class="school-card-header" @click="toggleExpand(g.group_num)">
            <!-- 概率圆形指示器 -->
            <div :class="['prob-indicator', probClass(g.group_probability_raw)]">
              <div class="prob-ring"></div>
              <div class="prob-text">
                {{ probLabelText(g.group_probability_raw) }}
                <small v-if="probValue(g.group_probability_raw) !== null">%</small>
              </div>
            </div>

            <div class="school-info">
              <div class="school-name">
                <span class="group-num">{{ g.group_num }}</span>
                {{ g.school_name }}
              </div>
              <div class="school-tags">
                <span v-for="tag in filteredTags(g)" :key="tag" class="school-tag">{{ tag }}</span>
              </div>
              <div class="school-meta-row">
                <span>📍 {{ g.location }}</span>
                <span>🏷 {{ g.type_label }}</span>
                <span v-if="g.ranking">📊 {{ g.ranking }}</span>
                <span>🎓 {{ g.majors.length }} 个专业</span>
                <span v-if="g.subject_req">📋 {{ g.subject_req }}</span>
              </div>
            </div>

            <div :class="['expand-icon', { open: expandedGroups.has(g.group_num) }]">▾</div>
          </div>

          <!-- 组级历年数据 -->
          <div v-if="hasYearData(g)" class="group-compact-stats">
            <div v-for="yl in yearLabels" :key="yl" class="stat-item">
              <span class="stat-value">{{ numText(g.group_years?.[yl]?.['最低分']) }}</span>
              <span class="stat-label">{{ yl.replace('物理', '') }} 最低分</span>
            </div>
            <div v-if="g.grad_rate" class="stat-item">
              <span class="stat-value">{{ g.grad_rate }}</span>
              <span class="stat-label">升学率</span>
            </div>
            <div v-if="g.postgrad_rate" class="stat-item">
              <span class="stat-value">{{ g.postgrad_rate }}</span>
              <span class="stat-label">保研率</span>
            </div>
            <div v-if="g.employ_rate" class="stat-item">
              <span class="stat-value">{{ g.employ_rate }}</span>
              <span class="stat-label">就业率</span>
            </div>
          </div>

          <!-- 专业表格 -->
          <div :class="['school-majors', { open: expandedGroups.has(g.group_num) }]">
            <div class="major-table-wrap" v-if="g.majors.length > 0">
              <table class="major-table">
                <thead><tr>
                  <th>专业名称</th><th class="prob-cell">录取<br>概率</th><th class="num-cell">计划</th>
                  <th class="tuition-cell">学费/年</th><th>学制</th>
                  <th v-for="y in ['2025','2024','2023','2022']" :key="y" class="num-cell year-group">
                    最低分<span class="year-label">{{ y }}</span>
                  </th>
                  <th v-for="y in ['2025','2024','2023','2022']" :key="'r'+y" class="num-cell year-group">
                    最低位次<span class="year-label">{{ y }}</span>
                  </th>
                </tr></thead>
                <tbody>
                  <tr v-for="m in g.majors" :key="m.code || m.name">
                    <td class="major-name-cell">
                      {{ cleanMajorName(m.name) }}
                      <span v-if="m.rating" class="major-rating">{{ m.rating }}</span>
                    </td>
                    <td class="prob-cell">
                      <span class="major-prob-tag" :style="probTagStyle(m.probability)">{{ probLabelText(m.probability) }}</span>
                    </td>
                    <td class="num-cell">{{ numText(m.plan) }}</td>
                    <td class="tuition-cell">{{ m.tuition ? '¥' + numText(m.tuition) : '—' }}</td>
                    <td>{{ m.duration ? m.duration + '年' : '—' }}</td>
                    <td v-for="y in yearLabels" :key="y" class="num-cell year-group">
                      {{ m.years?.[y]?.['最低分'] || '—' }}
                    </td>
                    <td v-for="y in yearLabels" :key="'r'+y" class="num-cell year-group">
                      {{ m.years?.[y]?.['最低位次'] ? numText(m.years[y]['最低位次']) : '—' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { currentTheme } = useTheme()
const data = ref(null)
const loading = ref(true)
const error = ref(null)
const activeTab = ref('')
const activeFilter = ref('all')
const searchQuery = ref('')
const expandedGroups = ref(new Set())
const yearLabels = ['2025物理', '2024物理', '2023物理', '2022物理']

const currentData = computed(() => data.value?.[activeTab.value] || null)

async function fetchData() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch('/api/volunteer')
    if (!res.ok) throw new Error(`请求失败 (${res.status})`)
    const json = await res.json()
    if (!json || Object.keys(json).length === 0) throw new Error('未找到志愿表数据')
    data.value = json
    const keys = Object.keys(json)
    if (keys.length > 0) activeTab.value = keys[0]
  } catch (e) {
    error.value = '加载失败: ' + e.message
  } finally { loading.value = false }
}
fetchData()

/** 文件按钮显示标签：优先 file_label，回退为从键名中提取分数，最长 20 字防撑破布局 */
function fileDisplayLabel(meta, key) {
  if (meta.file_label) return meta.file_label
  const m = String(key).match(/(\d+分)/)
  return m ? m[1] : String(key).slice(0, 20)
}

function switchFile(key) {
  activeTab.value = key
  expandedGroups.value = new Set()
  activeFilter.value = 'all'
  searchQuery.value = ''
}

function toggleExpand(num) {
  const s = new Set(expandedGroups.value)
  s.has(num) ? s.delete(num) : s.add(num)
  expandedGroups.value = s
}

function probValue(raw) {
  if (!raw || raw === '-' || raw === '新增' || raw === '-位') return null
  const n = parseInt(String(raw).replace('%', ''))
  return isNaN(n) ? null : n
}
function isHighProb(v) { return v !== null && v >= 70 }
function isMidProb(v) { return v !== null && v >= 40 && v < 70 }
function isLowProb(v) { return v !== null && v < 40 }
function probLabelText(raw) {
  if (!raw || raw === '-' || raw === '-位') return '—'
  return raw === '新增' ? '新增' : String(raw)
}
function probClass(raw) {
  if (!raw || raw === '-' || raw === '-位') return 'prob-none'
  if (raw === '新增') return 'prob-new'
  const v = probValue(raw)
  if (v === null) return 'prob-none'
  if (v >= 70) return 'prob-high'
  if (v >= 40) return 'prob-mid'
  return 'prob-low'
}
function probColor(raw) {
  if (!raw || raw === '-' || raw === '-位') return '#999'
  if (raw === '新增') return 'var(--tag-color)'
  const v = probValue(raw)
  if (v === null) return '#999'
  if (v >= 70) return 'var(--prob-high-color)'
  if (v >= 40) return 'var(--prob-mid-color)'
  return 'var(--prob-low-color)'
}
function probTagStyle(raw) {
  const c = probColor(raw)
  return { background: c + '22', color: c }
}
function numText(v) {
  if (v === null || v === undefined || v === '-' || v === '') return '—'
  const n = Number(v)
  return isNaN(n) ? String(v) : n.toLocaleString()
}
function cleanMajorName(name) {
  return String(name).replace(/\s*(等级考试|选考|物理|化学|生物|不限|科目).*/g, '').trim()
}
function filteredTags(g) {
  return (g.level_tags || []).filter(t => t && t !== '硕博点' && t !== '研究生院(部)' && t !== '研究生院').slice(0, 6)
}
function hasYearData(g) {
  const y2025 = g.group_years?.['2025物理']
  return y2025 && y2025['最低分'] != null
}

const totalMajors = computed(() => currentData.value ? currentData.value.groups.reduce((s, g) => s + g.majors.length, 0) : 0)
const highCount = computed(() => currentData.value ? currentData.value.groups.filter(g => isHighProb(probValue(g.group_probability_raw))).length : 0)
const midCount = computed(() => currentData.value ? currentData.value.groups.filter(g => isMidProb(probValue(g.group_probability_raw))).length : 0)
const lowCount = computed(() => currentData.value ? currentData.value.groups.filter(g => isLowProb(probValue(g.group_probability_raw))).length : 0)

const filterOptions = computed(() => {
  if (!currentData.value) return []
  const gs = currentData.value.groups
  const total = gs.length
  const h = gs.filter(g => isHighProb(probValue(g.group_probability_raw))).length
  const m = gs.filter(g => isMidProb(probValue(g.group_probability_raw))).length
  const l = gs.filter(g => isLowProb(probValue(g.group_probability_raw))).length
  const n = gs.filter(g => g.group_probability === '新增').length
  const u = gs.filter(g => !g.group_probability_raw || g.group_probability_raw === '-' || g.group_probability_raw === '-位').length
  return [
    { key: 'all', label: '全部', count: total },
    { key: 'high', label: '保底', count: h },
    { key: 'mid', label: '稳妥', count: m },
    { key: 'low', label: '冲刺', count: l },
    { key: 'new', label: '新增', count: n },
    { key: 'unknown', label: '待定', count: u }
  ]
})

const filteredGroups = computed(() => {
  if (!currentData.value) return []
  let r = currentData.value.groups
  if (activeFilter.value !== 'all') {
    r = r.filter(g => {
      if (activeFilter.value === 'high') return isHighProb(probValue(g.group_probability_raw))
      if (activeFilter.value === 'mid') return isMidProb(probValue(g.group_probability_raw))
      if (activeFilter.value === 'low') return isLowProb(probValue(g.group_probability_raw))
      if (activeFilter.value === 'new') return g.group_probability === '新增'
      if (activeFilter.value === 'unknown') return !g.group_probability_raw || g.group_probability_raw === '-' || g.group_probability_raw === '-位'
      return true
    })
  }
  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    r = r.filter(g =>
      g.school_name.toLowerCase().includes(q) ||
      (g.level_tags || []).some(t => t.toLowerCase().includes(q)) ||
      g.location.toLowerCase().includes(q) ||
      g.majors.some(m => m.name.toLowerCase().includes(q))
    )
  }
  // 按录取概率从高到低排序
  r.sort((a, b) => {
    const pa = probValue(a.group_probability_raw)
    const pb = probValue(b.group_probability_raw)
    if (pa !== null && pb !== null) return pb - pa
    if (pa !== null) return -1
    if (pb !== null) return 1
    return 0
  })
  return r
})
</script>

<style scoped>
.volunteer-container {
  max-width: 1200px; margin: 0 auto; padding: 20px 16px;
  font-size: 15px; color: var(--text-body, #2c3e50); min-height: 60vh;
}
.vol-header { text-align: center; margin-bottom: 20px; }
.vol-header h1 { font-size: 24px; color: var(--color-h1, #0a2540); }

/* ========== 三套主题 ========== */
.volunteer-container.theme-liuli {
  --card-bg: #fff; --card-shadow: 0 1px 3px rgba(0,0,0,.04), 0 6px 24px rgba(0,0,0,.05);
  --color-h1: #0a2540; --color-h2: #1e6bb8; --text-body: #2c3e50;
  --color-accent: #1e6bb8; --border-subtle: #e0e8f0;
  --tag-bg: #e8f0fe; --tag-color: #1e6bb8; --tag-border: #c4d8f0;
  --prob-high-bg: #e8f5e9; --prob-high-color: #2e7d32;
  --prob-mid-bg: #fff8e1; --prob-mid-color: #f57f17;
  --prob-low-bg: #fbe9e7; --prob-low-color: #c62828;
  --bg-th: #1e3a5f; --color-th: #fff; --border-td: #e8edf4; --bg-stripe: #f8fafc;
}
.volunteer-container.theme-chenger {
  --card-bg: #fffcf9; --card-shadow: 0 2px 4px rgba(0,0,0,.03), 0 12px 40px rgba(0,0,0,.06);
  --color-h1: #5c2a16; --color-h2: #c94f2b; --text-body: #4a3f37;
  --color-accent: #e8893a; --border-subtle: #eee5dc;
  --tag-bg: #fef3e7; --tag-color: #c94f2b; --tag-border: #f5dcc8;
  --prob-high-bg: #f1f8e9; --prob-high-color: #558b2f;
  --prob-mid-bg: #fff8e1; --prob-mid-color: #e65100;
  --prob-low-bg: #fce4ec; --prob-low-color: #bf360c;
  --bg-th: #5c2a16; --color-th: #fdf6ef; --border-td: #eee5dc; --bg-stripe: #fdf8f4;
}
.volunteer-container.theme-ziyan {
  --card-bg: #fcfaff; --card-shadow: 0 1px 2px rgba(0,0,0,.04), 0 8px 32px rgba(74,44,94,.06);
  --color-h1: #2d1b3d; --color-h2: #7c4d9e; --text-body: #3a3042;
  --color-accent: #7c4d9e; --border-subtle: #e8e0ee;
  --tag-bg: #f0eaf5; --tag-color: #7c4d9e; --tag-border: #ddd0e8;
  --prob-high-bg: #e8f5e9; --prob-high-color: #2e7d32;
  --prob-mid-bg: #fef3e7; --prob-mid-color: #e65100;
  --prob-low-bg: #fce4ec; --prob-low-color: #ad1457;
  --bg-th: #2d1b3d; --color-th: #f0eaf5; --border-td: #e8e0ee; --bg-stripe: #f8f4fb;
}

/* ========== 文件选择栏（代替原分数 Tab） ========== */
.file-bar {
  display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
}
.file-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border: 1px solid var(--border-subtle); border-radius: 10px;
  background: var(--card-bg); cursor: pointer; font-size: 14px;
  color: var(--text-body); transition: all .25s; font-family: inherit;
  box-shadow: var(--card-shadow);
}
.file-btn:hover { border-color: var(--color-accent); color: var(--color-h2); }
.file-btn.active {
  background: var(--color-accent); color: #fff; border-color: var(--color-accent);
}
.file-btn-dot { font-size: 16px; }
.file-btn-label { font-weight: 600; }
.file-btn-badge {
  display: inline-block; font-size: 11px; background: var(--tag-bg);
  color: var(--tag-color); padding: 1px 8px; border-radius: 10px;
  font-weight: 400;
}
.file-btn.active .file-btn-badge {
  background: rgba(255,255,255,0.2); color: #fff;
}

/* ========== 元信息 ========== */
.page-meta { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.meta-chip {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 12px; background: var(--tag-bg); border: 1px solid var(--tag-border);
  border-radius: 20px; font-size: 13px; color: var(--text-body);
}

/* ========== 筛选栏 ========== */
.filter-bar {
  display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;
}
.filter-bar-label { font-size: 13px; color: var(--text-body); opacity: .7; margin-right: 4px; }
.filter-btn {
  padding: 5px 14px; border: 1px solid var(--border-subtle); border-radius: 16px;
  background: var(--card-bg); cursor: pointer; font-size: 12px;
  color: var(--text-body); transition: all .2s; font-family: inherit;
}
.filter-btn:hover { border-color: var(--color-accent); color: var(--color-accent); }
.filter-btn.active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
.filter-btn .count { opacity: .6; margin-left: 3px; font-size: 11px; }
.search-box { margin-left: auto; display: flex; align-items: center; }
.search-box input {
  padding: 5px 12px; border: 1px solid var(--border-subtle); border-radius: 16px;
  font-size: 13px; background: var(--card-bg); color: var(--text-body);
  width: 160px; outline: none; transition: border-color .2s; font-family: inherit;
}
.search-box input:focus { border-color: var(--color-accent); }
.search-box input::placeholder { color: var(--text-body); opacity: .4; }

/* ========== 统计摘要 ========== */
.summary-bar {
  display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;
}
.summary-item {
  padding: 8px 16px; background: var(--card-bg); border-radius: 8px;
  box-shadow: var(--card-shadow); display: flex; align-items: center;
  gap: 8px; font-size: 13px;
}
.summary-item .num { font-weight: 700; font-size: 18px; color: var(--color-h1); }

/* ========== 卡片 ========== */
.card-list { display: flex; flex-direction: column; gap: 0; }
.school-card {
  background: var(--card-bg); border-radius: 12px; box-shadow: var(--card-shadow);
  margin-bottom: 16px; overflow: hidden; transition: background .3s, box-shadow .3s, border-color .3s;
  border: 1px solid transparent;
}
.school-card:hover { border-color: var(--border-subtle); }

/* 卡片头部 */
.school-card-header {
  padding: 16px 20px; display: flex; align-items: flex-start;
  gap: 12px; cursor: pointer; user-select: none; transition: background .2s;
}
.school-card-header:hover { background: var(--bg-stripe); }

/* 概率圆形指示器 */
.prob-indicator {
  flex-shrink: 0; width: 52px; height: 52px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; position: relative;
}
.prob-indicator .prob-ring {
  position: absolute; inset: 0; border-radius: 50%;
}
.prob-indicator .prob-text {
  position: relative; z-index: 1; color: #fff;
  font-size: 13px; line-height: 1.2; text-align: center;
}
.prob-indicator .prob-text small { display: block; font-size: 9px; font-weight: 400; opacity: .8; }
.prob-high { background: var(--prob-high-bg); border: 2px solid var(--prob-high-color); }
.prob-high .prob-text { color: var(--prob-high-color); }
.prob-mid { background: var(--prob-mid-bg); border: 2px solid var(--prob-mid-color); }
.prob-mid .prob-text { color: var(--prob-mid-color); }
.prob-low { background: var(--prob-low-bg); border: 2px solid var(--prob-low-color); }
.prob-low .prob-text { color: var(--prob-low-color); }
.prob-new { background: var(--tag-bg); border: 2px solid var(--tag-color); }
.prob-new .prob-text { color: var(--tag-color); font-size: 12px; }
.prob-none { background: var(--bg-stripe); border: 2px dashed var(--border-subtle); }
.prob-none .prob-text { color: var(--text-body); opacity: .5; }

/* 学校信息 */
.school-info { flex: 1; min-width: 0; }
.school-name { font-size: 16px; font-weight: 700; color: var(--color-h1); margin-bottom: 4px; }
.school-name .group-num {
  display: inline-block; font-size: 11px; font-weight: 400;
  background: var(--tag-bg); color: var(--tag-color); padding: 0 6px;
  border-radius: 4px; margin-right: 6px; vertical-align: middle;
}
.school-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; }
.school-tag {
  font-size: 11px; padding: 1px 8px; border-radius: 4px;
  background: var(--tag-bg); color: var(--tag-color); border: 1px solid var(--tag-border);
}
.school-meta-row { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; color: var(--text-body); opacity: .7; }
.school-meta-row span { white-space: nowrap; }
.expand-icon {
  flex-shrink: 0; width: 24px; height: 24px;
  display: flex; align-items: center; justify-content: center;
  transition: transform .3s; color: var(--text-body); opacity: .4;
}
.expand-icon.open { transform: rotate(180deg); }

/* 组级历年数据 */
.group-compact-stats {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 6px; padding: 10px 20px; background: var(--bg-stripe);
  border-top: 1px solid var(--border-subtle);
}
.stat-item { text-align: center; font-size: 12px; }
.stat-item .stat-value { font-size: 15px; font-weight: 700; color: var(--color-h1); display: block; }
.stat-item .stat-label { color: var(--text-body); opacity: .6; font-size: 11px; }

/* 专业表格 */
.school-majors { border-top: 1px solid var(--border-subtle); overflow: hidden; max-height: 0; transition: max-height .35s ease; }
.school-majors.open { max-height: 5000px; }
.major-table-wrap { overflow-x: auto; padding: 0; }
.major-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 700px; }
.major-table th {
  background: var(--bg-th); color: var(--color-th); font-weight: 600;
  padding: 8px 10px; text-align: left; font-size: 12px; white-space: nowrap; letter-spacing: .3px;
}
.major-table td {
  padding: 8px 10px; border-bottom: 1px solid var(--border-td);
  color: var(--text-body); vertical-align: middle;
}
.major-table tr:nth-child(even) td { background: var(--bg-stripe); }
.major-table tr:hover td { background: var(--tag-bg); }
.major-table .major-name-cell { font-weight: 600; color: var(--color-h1); min-width: 140px; }
.major-table .major-rating {
  display: inline-block; font-size: 11px; font-weight: 700; padding: 1px 6px;
  border-radius: 4px; background: var(--tag-bg); color: var(--tag-color); margin-left: 4px;
}
.major-table .num-cell { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
.major-table .year-group { border-left: 1px solid var(--border-subtle); }
.major-table .year-label { display: block; font-size: 10px; opacity: .6; font-weight: 400; }
.major-table .prob-cell { text-align: center; }
.major-table .tuition-cell { text-align: right; white-space: nowrap; }
.major-prob-tag { display: inline-block; font-size: 11px; padding: 1px 8px; border-radius: 10px; font-weight: 600; }

/* 通用 */
.loading, .empty-state { text-align: center; padding: 60px 20px; color: var(--text-body); opacity: .6; }

@media (max-width: 768px) {
  .volunteer-container { padding: 12px; }
  .school-card-header { padding: 12px 14px; }
  .prob-indicator { width: 44px; height: 44px; }
  .prob-indicator .prob-text { font-size: 11px; }
  .school-name { font-size: 14px; }
  .search-box input { width: 100px; }
  .group-compact-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>
