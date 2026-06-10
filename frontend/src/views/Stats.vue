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
        <h2>📈 近 24 小时访问趋势</h2>
        <div v-if="hourlyKeys.length > 0" class="bar-chart">
          <div v-for="(count, hour) in sortedHourly" :key="hour" class="bar-item">
            <div class="bar-fill" :style="{ height: barHeight(count) + '%' }"
                 :title="`${hour}:00 - ${count} 次`"></div>
            <div class="bar-label">{{ hour.slice(11) }}时</div>
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

const sortedHourly = computed(() => {
  const hourly = stats.value.dailyViews || {}
  return Object.entries(hourly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-24)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
})

const hourlyKeys = computed(() => Object.keys(sortedHourly.value))

function barHeight(count) {
  const values = Object.values(stats.value.dailyViews || {})
  const max = Math.max(...values, 1)
  return Math.max((count / max) * 100, 2)
}

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

.bar-chart {
  display: flex; align-items: flex-end; gap: 2px;
  height: 140px; padding: 16px 0; overflow-x: auto;
}
.bar-item {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; min-width: 20px;
}
.bar-fill {
  width: 100%; background: var(--accent-color, #1a73e8); border-radius: 2px 2px 0 0;
  min-height: 2px; transition: height 0.3s, background 0.3s; cursor: help;
}
.bar-fill:hover { background: var(--accent-hover, #1557b0); }
.bar-label {
  font-size: 10px; color: #999; margin-top: 4px;
  white-space: nowrap;
}
</style>
