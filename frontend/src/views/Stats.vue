<template>
  <div class="container">
    <h1 class="page-title">访问统计</h1>

    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else>
      <!-- 总览卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-num">{{ stats.totalFiles }}</div>
          <div class="stat-label">文档总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-num">{{ stats.totalViews }}</div>
          <div class="stat-label">总访问量</div>
        </div>
      </div>

      <!-- 热门文件 Top10 -->
      <section class="section">
        <h2>🔥 热门文件 Top10</h2>
        <div v-if="stats.topFiles && stats.topFiles.length > 0">
          <div v-for="(item, i) in stats.topFiles" :key="item.file" class="rank-row">
            <span class="rank-num">{{ i + 1 }}</span>
            <router-link :to="`/file/${item.file}`" class="rank-file">{{ item.file }}</router-link>
            <span class="rank-views">{{ item.views }} 次访问</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无访问数据</p>
        </div>
      </section>

      <!-- 近日访问趋势 -->
      <section class="section">
        <h2>📈 近 30 天访问趋势</h2>
        <div v-if="chartPoints.length > 1" class="line-chart-wrap">
          <svg class="line-chart" :viewBox="`0 0 ${svgW} ${svgH}`" preserveAspectRatio="none">
            <!-- 网格线 -->
            <line v-for="y in gridY" :key="'g'+y" :x1="padL" :y1="y" :x2="svgW-padR" :y2="y"
                  stroke="var(--border-color,#eee)" stroke-width="1" />
            <!-- 折线 -->
            <polyline :points="linePoints" fill="none"
                      stroke="var(--accent-color,#1e6bb8)" stroke-width="2" stroke-linejoin="round" />
            <!-- 数据点 -->
            <circle v-for="(p, i) in chartPoints" :key="i" :cx="p.x" :cy="p.y" r="3"
                    fill="var(--accent-color,#1e6bb8)" />
            <!-- 悬浮提示（不可见矩形扩大点击区） -->
            <rect v-for="(p, i) in chartPoints" :key="'h'+i"
                  :x="p.x - hitW/2" y="0" :width="hitW" :height="svgH"
                  fill="transparent"
                  @mouseenter="hoverIdx = i" @mouseleave="hoverIdx = -1" />
          </svg>
          <!-- 悬浮提示标签 -->
          <div class="chart-tooltip" v-if="hoverIdx >= 0"
               :style="{ left: tooltipLeft + 'px' }">
            <strong>{{ chartLabels[hoverIdx] }}</strong>：{{ chartValues[hoverIdx] }} 次
          </div>
          <!-- X 轴标签 -->
          <div class="chart-x-labels">
            <span v-for="(l, i) in xLabels" :key="i" class="chart-x-label">{{ l }}</span>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>暂无趋势数据</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { api } from '@/api'

const stats = ref({})
const loading = ref(true)
const error = ref(null)

// SVG 折线图尺寸
const padL = 30, padR = 10, padT = 10, padB = 0
const svgW = 600, svgH = 160
const chartW = svgW - padL - padR
const hitW = 30  // 每个点的点击区宽度

const hoverIdx = ref(-1)

// 按日期排序，取最近 30 天
const sortedDaily = computed(() => {
  const daily = stats.value.dailyViews || {}
  return Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
})

const chartLabels = computed(() => sortedDaily.value.map(([k]) => k))
const chartValues = computed(() => sortedDaily.value.map(([, v]) => v))

// 折线图数据点
const chartPoints = computed(() => {
  const vals = chartValues.value
  const max = Math.max(...vals, 1)
  return vals.map((v, i) => ({
    x: padL + (i / Math.max(vals.length - 1, 1)) * chartW,
    y: svgH - padB - ((v / max) * (svgH - padT - padB))
  }))
})

// polyline 坐标串
const linePoints = computed(() =>
  chartPoints.value.map(p => `${p.x},${p.y}`).join(' ')
)

// 网格线 Y 位置（4 条）
const gridY = computed(() => {
  const max = Math.max(...chartValues.value, 1)
  const steps = 4
  return Array.from({ length: steps + 1 }, (_, i) =>
    svgH - padB - (i / steps) * (svgH - padT - padB)
  )
})

// X 轴标签（等距取最多 7 个）
const xLabels = computed(() => {
  const labels = chartLabels.value
  if (labels.length <= 7) return labels.map(d => d.slice(5))
  const step = Math.ceil(labels.length / 7)
  return labels.filter((_, i) => i % step === 0 || i === labels.length - 1)
               .map(d => d.slice(5))
})

// 悬浮提示位置
const tooltipLeft = computed(() => {
  const pts = chartPoints.value
  if (hoverIdx.value < 0 || hoverIdx.value >= pts.length) return 0
  return Math.max(0, Math.min(pts[hoverIdx.value].x - 30, svgW - 100))
})

onMounted(async () => {
  try {
    stats.value = await api.getStats()
  } catch {
    error.value = '加载统计数据失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.stat-cards { display: flex; gap: 16px; margin-bottom: 24px; }
.stat-card {
  flex: 1; background: var(--card-bg, #fff); padding: 24px; border-radius: 8px;
  text-align: center; box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  transition: background 0.3s, box-shadow 0.3s;
}
.stat-num { font-size: 36px; font-weight: bold; color: var(--accent-color, #1a73e8); }
.stat-label { font-size: 14px; color: var(--text-secondary, #999); margin-top: 4px; }

.section {
  background: var(--card-bg, #fff); padding: 20px; border-radius: 8px; margin-bottom: 16px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  transition: background 0.3s, box-shadow 0.3s;
}
.section h2 { font-size: 16px; margin-bottom: 16px; color: var(--text-primary, #1a1a2e); }

.rank-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 0; border-bottom: 1px solid var(--border-color, #f5f5f5);
}
.rank-row:last-child { border-bottom: none; }
.rank-num {
  width: 28px; font-weight: bold; color: var(--text-secondary, #999);
  font-size: 14px;
}
.rank-file { flex: 1; font-size: 14px; }
.rank-views { font-size: 13px; color: var(--text-secondary, #999); white-space: nowrap; }

.line-chart-wrap {
  position: relative; padding: 16px 0 4px;
}
.line-chart {
  width: 100%; height: 160px; overflow: visible;
}
.chart-tooltip {
  position: absolute; top: 0; padding: 4px 10px;
  background: var(--accent-color, #1e6bb8); color: #fff;
  border-radius: 4px; font-size: 12px; white-space: nowrap;
  pointer-events: none; transform: translateY(-100%); margin-top: -4px;
  z-index: 10;
}
.chart-x-labels {
  display: flex; justify-content: space-between;
  padding: 0 0 0 30px; font-size: 11px; color: var(--text-secondary, #999);
}
.chart-x-label {
  flex: 1; text-align: center;
}
</style>
