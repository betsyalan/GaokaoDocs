<template>
  <div class="container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <!-- 空（大学不存在） -->
    <div v-else-if="!data" class="empty-state">
      <div class="icon">🏫</div>
      <p>未找到该大学数据</p>
    </div>

    <template v-else>
      <!-- 大学标题 -->
      <h1 class="page-title">
        <component :is="GraduationCap" :size="24" stroke-width="1.5" style="vertical-align:middle;margin-right:8px;color:var(--accent-color)" />
        {{ data.university.name }}
      </h1>

      <!-- 免责声明 -->
      <div class="disclaimer">
        ⚠️ 所有录取数据由程序自动抓取自各高校招生官网，仅供参考。填报志愿前请务必以官方最新公布的招生章程为准。
      </div>

      <!-- 元信息 -->
      <div class="page-meta">
        <span class="meta-chip">📍 {{ data.university.province }}{{ data.university.city ? ' · ' + data.university.city : '' }}</span>
        <span class="meta-chip">📚 {{ data.admissionProvince }} · {{ data.subjectType }}</span>
        <span v-for="tag in data.university.tags" :key="tag" class="meta-chip tag-chip">{{ tag }}</span>
      </div>

      <!-- 年份切换 -->
      <div class="year-bar">
        <button
          v-for="y in data.years" :key="y"
          :class="['year-btn', { active: activeYear === y }]"
          @click="switchYear(y)"
        >{{ y }}年</button>
      </div>

      <!-- 统计摘要 -->
      <div class="summary-bar">
        <div class="summary-item">
          <span class="num">{{ data.groups.length }}</span><span>专业组</span>
        </div>
        <div class="summary-item">
          <span class="num">{{ totalMajors }}</span><span>专业</span>
        </div>
      </div>

      <!-- 录取数据（每个专业组独立表格，列宽统一） -->
      <div class="data-card">
        <div v-for="g in data.groups" :key="g.groupName" class="group-card">
          <div class="group-header" @click="toggleGroup(g.groupName)">
            <span :class="['group-toggle', { open: !collapsedGroups.has(g.groupName) }]">▾</span>
            <span class="group-name">{{ g.groupName }}</span>
            <span class="group-meta">{{ g.majors.length }} 个专业</span>
          </div>
          <div v-if="!collapsedGroups.has(g.groupName)" class="group-body">
            <table class="data-table" v-if="g.majors.length > 0">
              <thead>
                <tr>
                  <th class="col-major">专业</th>
                  <th class="col-num">计划</th>
                  <th class="col-num">最高分</th>
                  <th class="col-num">最低分</th>
                  <th class="col-num">平均分</th>
                  <th class="col-num col-rank">最低排位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in g.majors" :key="m.majorName">
                  <td class="col-major">{{ m.majorName }}</td>
                  <td class="col-num">{{ m.enrollmentCount || '-' }}</td>
                  <td class="col-num">{{ m.maxScore || '-' }}</td>
                  <td class="col-num">{{ m.minScore || '-' }}</td>
                  <td class="col-num">{{ m.avgScore || '-' }}</td>
                  <td class="col-num col-rank">{{ m.minRank || '-' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty-inline">暂无专业数据</div>
          </div>
        </div>
        <div v-if="data.groups.length === 0" class="empty-inline">暂无录取数据</div>
      </div>

      <!-- 数据来源 -->
      <div class="source-footer" v-if="data.sourceUrl">
        数据来源：<a :href="data.sourceUrl" target="_blank" rel="noopener">{{ data.sourceUrl }}</a>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import { GraduationCap } from 'lucide-vue-next'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const data = ref(null)
const collapsedGroups = ref(new Set())
const activeYear = ref(null)

const totalMajors = computed(() => {
  if (!data.value) return 0
  return data.value.groups.reduce((s, g) => s + g.majors.length, 0)
})

function toggleGroup(name) {
  const s = new Set(collapsedGroups.value)
  if (s.has(name)) s.delete(name); else s.add(name)
  collapsedGroups.value = s
}

async function loadData(code, year) {
  if (!code) {
    error.value = '大学代码无效'
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  data.value = null
  try {
    const result = await api.getGaokaoAdmission(code, year)
    if (!result) {
      error.value = '未找到该大学数据'
      return
    }
    data.value = result
    activeYear.value = result.activeYear
  } catch (e) {
    error.value = '加载数据失败: ' + e.message
  } finally {
    loading.value = false
  }
}

async function switchYear(year) {
  activeYear.value = year
  await loadData(route.params.code, year)
}

// 监听路由参数变化，切换大学时重新加载
watch(
  () => route.params.code,
  (code) => {
    if (code) loadData(code)
  },
  { immediate: true }
)
</script>

<style scoped>
/* 元信息 */
.page-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.meta-chip {
  padding: 4px 12px;
  background: var(--body-bg, #f5f5f5);
  border-radius: 16px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  border: 1px solid var(--border-color, #eee);
}
.tag-chip {
  background: color-mix(in srgb, var(--accent-color, #1e6bb8) 10%, transparent);
  border-color: color-mix(in srgb, var(--accent-color, #1e6bb8) 30%, transparent);
  color: var(--accent-color, #1e6bb8);
  font-weight: 500;
}

/* 统计摘要 — 复用志愿表样式 */
/* 年份切换栏 */
.year-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.year-btn {
  padding: 4px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 20px;
  background: var(--card-bg, #fff);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  color: var(--text-secondary, #666);
}
.year-btn:hover {
  border-color: var(--accent-color, #1e6bb8);
  color: var(--accent-color, #1e6bb8);
}
.year-btn.active {
  background: var(--accent-color, #1e6bb8);
  color: #fff;
  border-color: var(--accent-color, #1e6bb8);
  font-weight: 600;
}

/* 免责声明 */
.disclaimer {
  padding: 10px 16px;
  margin-bottom: 16px;
  background: color-mix(in srgb, var(--accent-color, #1e6bb8) 6%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-color, #1e6bb8) 20%, transparent);
  border-radius: 8px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  line-height: 1.6;
}

/* 数据来源 */
.source-footer {
  margin-top: 16px;
  padding: 8px 0;
  font-size: 12px;
  color: var(--text-secondary, #999);
  text-align: center;
}
.source-footer a {
  color: var(--accent-color, #1e6bb8);
  word-break: break-all;
}

.summary-bar {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}
.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 20px;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  gap: 4px;
  font-size: 12px;
  color: var(--text-secondary, #999);
}
.summary-item .num {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary, #333);
}

/* 数据卡片 */
.data-card {
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  overflow: hidden;
}

/* 专业组卡片（独立表格，间距分开） */
.group-card {
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}
.group-card:last-child {
  border-bottom: none;
}
.group-card + .group-card {
  margin-top: 12px;
  padding-top: 4px;
  border-top: 1px solid var(--border-color, #eee);
}

/* 专业组标题 */
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
}
.group-toggle {
  font-size: 12px;
  color: var(--text-secondary, #999);
  transition: transform 0.2s;
  line-height: 1;
  flex-shrink: 0;
}
.group-toggle.open {
  transform: rotate(0deg);
}
.group-toggle:not(.open) {
  transform: rotate(-90deg);
}
.group-name {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}
.group-meta {
  font-size: 12px;
  color: var(--text-secondary, #999);
}

/* 表格 — table-layout:fixed 保证跨表格列宽一致 */
.data-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table thead {
  background: color-mix(in srgb, var(--accent-color, #1e6bb8) 8%, transparent);
}
.data-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--accent-color, #1e6bb8);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-color, #1e6bb8) 20%, transparent);
  white-space: nowrap;
}
.data-table td {
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color, #f5f5f5);
  color: var(--text-primary, #333);
}
.data-table tbody tr:hover {
  background: var(--body-bg, #f0f0f0);
}
.data-table tbody tr:nth-child(even) {
  background: var(--body-bg, #f5f5f5);
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* 列宽 — 百分比值，所有表格共享同一比例 */
.col-major {
  width: 36%;
}
.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  width: 12%;
}
.col-rank {
  width: 13%;
}

.empty-inline {
  padding: 24px 16px;
  color: var(--text-secondary, #999);
  font-size: 13px;
  text-align: center;
}
</style>
