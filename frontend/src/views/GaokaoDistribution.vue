<template>
  <div class="container">
    <!-- 加载中 -->
    <div v-if="loading" class="loading">加载中...</div>

    <!-- 错误 -->
    <div v-else-if="error" class="error-msg">{{ error }}</div>

    <template v-else>
      <h1 class="page-title">
        <component :is="BarChart4" :size="24" stroke-width="1.5" style="vertical-align:middle;margin-right:8px" />
        一分一段表
      </h1>

      <!-- 元信息 -->
      <div class="page-meta" v-if="meta">
        <span class="meta-chip">📍 {{ meta.province }}</span>
        <span class="meta-chip">📅 {{ meta.year }}</span>
        <span class="meta-chip">📚 {{ meta.subjectType }}</span>
      </div>

      <!-- 数据表格 -->
      <div class="data-card" v-if="rows.length > 0">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-score">分数</th>
              <th class="col-num">本段人数</th>
              <th class="col-num">本科累计</th>
              <th class="col-num">专科累计</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.score">
              <td class="col-score">{{ r.score }}</td>
              <td class="col-num">{{ r.bachelorCount }}</td>
              <td class="col-num">{{ r.bachelorCumulative }}</td>
              <td class="col-num">{{ r.associateCumulative }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-state">
        <div class="icon">📊</div>
        <p>暂无数据</p>
      </div>

      <!-- 统计信息 -->
      <div class="table-footer" v-if="rows.length > 0">
        共 {{ rows.length }} 条记录
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import { BarChart4 } from 'lucide-vue-next'

const loading = ref(true)
const error = ref(null)
const rows = ref([])
const meta = ref(null)

onMounted(async () => {
  try {
    const data = await api.getGaokaoDistribution()
    rows.value = data.rows || []
    meta.value = data.meta || null
  } catch (e) {
    error.value = '加载数据失败: ' + e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
/* 元信息 */
.page-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
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

/* 数据卡片 */
.data-card {
  background: var(--card-bg, #fff);
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  overflow: hidden;
}

/* 数据表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.data-table thead {
  background: color-mix(in srgb, var(--accent-color, #1e6bb8) 8%, transparent);
}
.data-table th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--accent-color, #1e6bb8);
  border-bottom: 1px solid color-mix(in srgb, var(--accent-color, #1e6bb8) 20%, transparent);
  white-space: nowrap;
}
.data-table td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color, #f0f0f0);
  color: var(--text-primary, #333);
}
.data-table tbody tr:hover {
  background: var(--body-bg, #f5f5f5);
}
.data-table tbody tr:nth-child(even) {
  background: var(--body-bg, #f5f5f5);
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* 列宽 */
.col-score {
  font-weight: 600;
  width: 120px;
}
.col-num {
  text-align: left;
  font-variant-numeric: tabular-nums;
  width: 120px;
}

/* 页脚 */
.table-footer {
  padding: 12px 0;
  font-size: 13px;
  color: var(--text-secondary, #999);
  text-align: center;
}
</style>
