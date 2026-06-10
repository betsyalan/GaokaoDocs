# 高考录取数据集成 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 GaokaoDocs 系统中集成 `gaokao_scores.db` 数据库，侧栏新增「历年录取分」和「一分一段表」两个分类，实现录取数据浏览。

**Architecture:** Express 后端新增 SQLite 数据查询服务 + 3 个 API 端点；Vue 前端侧栏新增特殊数据分类渲染，2 个新视图组件展示数据表格。

**Tech Stack:** Node.js 22 `node:sqlite`, Express, Vue 3, Lucide Icons

**数据源：** `data/gaokao_scores.db`

---

## 文件变更总览

| 动作 | 文件 |
|------|------|
| 新建 | `server/services/gaokaoData.js` |
| 新建 | `server/routes/gaokao.js` |
| 新建 | `frontend/src/views/GaokaoDistribution.vue` |
| 新建 | `frontend/src/views/GaokaoAdmissionDetail.vue` |
| 修改 | `server/index.js` |
| 修改 | `frontend/src/api/index.js` |
| 修改 | `frontend/src/router/index.js` |
| 修改 | `frontend/src/components/FileSidebar.vue` |

---

### Task 1: 后端 SQLite 数据查询服务

**文件:** 新建 `server/services/gaokaoData.js`

封装对 `gaokao_scores.db` 的查询，使用 Node.js 22 内置 `node:sqlite`。

- [ ] **Step 1: 创建数据服务**

```javascript
/**
 * 高考录取数据查询服务
 * 封装对 gaokao_scores.db 的查询
 */
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '../../data/gaokao_scores.db')

let db = null

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH)
  }
  return db
}

/**
 * 获取大学列表，按所在地省份分组
 * 返回: { provinces: [{ province, universities: [{ code, name, city, tags }] }] }
 */
export function getUniversities() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT u.university_code AS code,
           u.university_name AS name,
           u.province,
           u.city,
           u.is_ministry_affiliated,
           u.is_985,
           u.is_211,
           u.is_double_first_class
    FROM universities_info u
    WHERE u.university_code IN (
      SELECT DISTINCT university_code FROM university_admission_data
    )
    ORDER BY u.province, u.university_name
  `).all()

  // 按省份分组
  const provinceMap = {}
  for (const r of rows) {
    if (!provinceMap[r.province]) {
      provinceMap[r.province] = { province: r.province, universities: [] }
    }
    const tags = []
    if (r.is_ministry_affiliated) tags.push('部属')
    if (r.is_985) tags.push('985')
    if (r.is_211) tags.push('211')
    if (r.is_double_first_class) tags.push('双一流')
    provinceMap[r.province].universities.push({
      code: r.code,
      name: r.name,
      city: r.city || '',
      tags
    })
  }

  return {
    provinces: Object.values(provinceMap)
  }
}

/**
 * 获取指定大学的录取数据，按专业组分组
 * @param {string} universityCode - 大学代码
 * 返回: { university: { name, code, province, city, tags }, groups: [{ groupName, majors: [...] }] }
 */
export function getAdmissionByCode(universityCode) {
  const db = getDb()

  // 获取大学基本信息
  const uniInfo = db.prepare(`
    SELECT university_name, province, city,
           is_ministry_affiliated, is_985, is_211, is_double_first_class
    FROM universities_info
    WHERE university_code = ?
  `).get(universityCode)

  if (!uniInfo) return null

  // 获取录取数据
  const rows = db.prepare(`
    SELECT year, province, subject_type, admission_type,
           subject_group_name, major_name, enrollment_count,
           max_score, min_score, avg_score, min_rank
    FROM university_admission_data
    WHERE university_code = ?
    ORDER BY subject_group_name, major_name
  `).all(universityCode)

  // 按专业组分组
  const groups = []
  const groupMap = {}

  for (const r of rows) {
    const key = r.subject_group_name || '其他'
    if (!groupMap[key]) {
      groupMap[key] = {
        groupName: key,
        admissionType: r.admission_type || '',
        majors: []
      }
      groups.push(groupMap[key])
    }
    groupMap[key].majors.push({
      majorName: r.major_name || '',
      enrollmentCount: r.enrollment_count,
      maxScore: r.max_score,
      minScore: r.min_score,
      avgScore: r.avg_score,
      minRank: r.min_rank
    })
  }

  const tags = []
  if (uniInfo.is_ministry_affiliated) tags.push('部属')
  if (uniInfo.is_985) tags.push('985')
  if (uniInfo.is_211) tags.push('211')
  if (uniInfo.is_double_first_class) tags.push('双一流')

  return {
    university: {
      name: uniInfo.university_name,
      code: universityCode,
      province: uniInfo.province,
      city: uniInfo.city || '',
      tags
    },
    year: rows.length > 0 ? rows[0].year : null,
    admissionProvince: rows.length > 0 ? rows[0].province : null,
    subjectType: rows.length > 0 ? rows[0].subject_type : null,
    groups
  }
}

/**
 * 获取一分一段表数据
 * 返回: { rows: [{ score, bachelorCount, bachelorCumulative, associateCount, associateCumulative }],
 *        meta: { province, year, subjectType } }
 */
export function getDistribution() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT score, bachelor_count, bachelor_cumulative,
           associate_count, associate_cumulative
    FROM province_score_distribution
    ORDER BY score DESC
  `).all()

  // 获取元信息
  const meta = db.prepare(`
    SELECT province, year, subject_type
    FROM province_score_distribution
    LIMIT 1
  `).get()

  return {
    rows: rows.map(r => ({
      score: r.score,
      bachelorCount: r.bachelor_count,
      bachelorCumulative: r.bachelor_cumulative,
      associateCount: r.associate_count,
      associateCumulative: r.associate_cumulative
    })),
    meta: meta ? { province: meta.province, year: meta.year, subjectType: meta.subject_type } : null
  }
}
```

- [ ] **Step 2: 验证服务可导入**

```bash
node -e "import('./server/services/gaokaoData.js').then(m => { console.log('ok', typeof m.getUniversities); process.exit(0) }).catch(e => { console.error(e); process.exit(1) })"
```

期望输出: `ok function`

---

### Task 2: 后端 API 路由

**新建:** `server/routes/gaokao.js`
**修改:** `server/index.js`

- [ ] **Step 1: 创建路由文件**

```javascript
import { Router } from 'express'
import { getUniversities, getAdmissionByCode, getDistribution } from '../services/gaokaoData.js'

const router = Router()

// GET /api/gaokao/universities — 获取大学列表（按省份分组）
router.get('/gaokao/universities', (req, res) => {
  try {
    const data = getUniversities()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/gaokao/admission/:code — 获取指定大学录取数据
router.get('/gaokao/admission/:code', (req, res) => {
  try {
    const data = getAdmissionByCode(req.params.code)
    if (!data) {
      return res.status(404).json({ error: '大学未找到' })
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/gaokao/distribution — 获取一分一段表
router.get('/gaokao/distribution', (req, res) => {
  try {
    const data = getDistribution()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
```

- [ ] **Step 2: 在 server/index.js 中注册新路由**

在 `import volunteerRoutes` 之后添加：
```javascript
import gaokaoRoutes from './routes/gaokao.js'
```

在 `app.use('/api', volunteerRoutes)` 之后添加：
```javascript
app.use('/api', gaokaoRoutes)
```

- [ ] **Step 3: 验证 API**

```bash
# 启动服务器（需要先设置 ADMIN_PASSWORD）
ADMIN_PASSWORD=test node server/index.js &
sleep 2
curl -s http://localhost:3000/api/gaokao/universities | head -c 200
echo ""
curl -s http://localhost:3000/api/gaokao/distribution | head -c 200
echo ""
curl -s http://localhost:3000/api/gaokao/admission/10013 | head -c 200
echo ""
kill %1 2>/dev/null
```

期望：应返回 JSON 数据，不走文件系统，直接从 SQLite 读取。

---

### Task 3: 前端 API 方法

**修改:** `frontend/src/api/index.js`

- [ ] **Step 1: 添加数据 API 方法**

在 `export const api = { ... }` 对象中新增：

```javascript
  // 高考数据
  getGaokaoUniversities: () => request('/gaokao/universities'),
  getGaokaoAdmission: (code) => request(`/gaokao/admission/${code}`),
  getGaokaoDistribution: () => request('/gaokao/distribution'),
```

---

### Task 4: 前端路由

**修改:** `frontend/src/router/index.js`

- [ ] **Step 1: 新增两个路由**

在 `routes` 数组中新增：

```javascript
  { path: '/gaokao/distribution', name: 'GaokaoDistribution', component: () => import('@/views/GaokaoDistribution.vue') },
  { path: '/gaokao/admission/:code', name: 'GaokaoAdmissionDetail', component: () => import('@/views/GaokaoAdmissionDetail.vue') },
```

---

### Task 5: 侧栏 — 新增数据分类区

**修改:** `frontend/src/components/FileSidebar.vue`

思路：在现有文件分类列表后面，新增一个固定区域显示「历年录取分」和「一分一段表」两个数据库驱动的分类。样式和交互与现有分类保持一致。

- [ ] **Step 1: 新增 Lucide 图标导入**

在 `import { BookOpen, GraduationCap, Target, BarChart3, FileText, Globe, FilePen, Code2, BookMarked, Table, File }` 的末尾添加：
```javascript
import { ScrollText, BarChart4, ChevronDown } from 'lucide-vue-next'
```

- [ ] **Step 2: 新增数据分类定义和状态变量**

在 `const types = [...]` 之后添加：

```javascript
// 历年录取分的大学列表（按省份分组）
const universitiesByProvince = ref([])
const uniLoading = ref(false)
const collapsedProvince = ref(new Set())

// 当前激活的大学（高亮用）
const activeUniCode = computed(() => route.params.code || null)
```

- [ ] **Step 3: 加载大学列表数据**

在 `loadFiles` 函数之后添加：

```javascript
async function loadUniversities() {
  uniLoading.value = true
  try {
    const data = await api.getGaokaoUniversities()
    universitiesByProvince.value = data.provinces || []
  } catch {
    // 静默失败，分类直接不展示
    universitiesByProvince.value = []
  } finally {
    uniLoading.value = false
  }
}

function toggleProvince(province) {
  const s = new Set(collapsedProvince.value)
  if (s.has(province)) s.delete(province); else s.add(province)
  collapsedProvince.value = s
}

// 在 onMounted 中同时加载大学数据
// 将原本的 onMounted(loadFiles) 改为：
onMounted(() => {
  loadFiles()
  loadUniversities()
})
```

- [ ] **Step 4: 在模板中新增数据分类渲染区域**

在文件列表 `</nav>` 结束标签之后、`</aside>` 之前插入：

```html
      <!-- 高考数据分类（数据库驱动） -->
      <nav class="sidebar-files" v-if="universitiesByProvince.length > 0">
        <div class="sidebar-section-divider">高考数据</div>

        <!-- 历年录取分 -->
        <div class="sidebar-cat-group">
          <div class="sidebar-cat-header" @click="toggleCat('admission')">
            <component :is="ScrollText" :size="14" stroke-width="1.5" />
            <span class="sidebar-cat-label">历年录取分</span>
            <span class="sidebar-cat-count">
              {{ universitiesByProvince.reduce((s, p) => s + p.universities.length, 0) }}
            </span>
            <span :class="['sidebar-cat-toggle', { open: !collapsedCats.has('admission') }]">▾</span>
          </div>
          <div v-if="!collapsedCats.has('admission')">
            <!-- 按省份分组 -->
            <div v-for="prov in universitiesByProvince" :key="prov.province" class="sidebar-cat-group">
              <div class="sidebar-province-header" @click.stop="toggleProvince(prov.province)">
                <span class="province-name">{{ prov.province }}</span>
                <span class="sidebar-cat-count">{{ prov.universities.length }}</span>
                <span :class="['sidebar-cat-toggle', { open: !collapsedProvince.has(prov.province) }]">▾</span>
              </div>
              <div v-if="!collapsedProvince.has(prov.province)">
                <router-link
                  v-for="u in prov.universities" :key="u.code"
                  :to="`/gaokao/admission/${u.code}`"
                  :class="['file-item', { active: activeUniCode === u.code }]"
                  @click="onFileClick"
                >
                  <span class="file-icon">{{ '' }}</span>
                  <span class="file-name" :title="u.name">{{ u.name }}</span>
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <!-- 一分一段表 -->
        <div class="sidebar-cat-group">
          <router-link
            to="/gaokao/distribution"
            :class="['file-item', { active: $route.path === '/gaokao/distribution' }]"
            @click="onFileClick"
          >
            <span class="file-icon">
              <component :is="BarChart4" :size="16" stroke-width="1.5" />
            </span>
            <span class="file-name">一分一段表</span>
          </router-link>
        </div>
      </nav>
```

- [ ] **Step 5: 添加省份分组样式**

在 `<style scoped>` 末尾追加：

```css
/* 数据分类隔断 */
.sidebar-section-divider {
  padding: 16px 16px 4px;
  font-size: 11px;
  font-weight: 700;
  color: var(--sidebar-text-secondary, rgba(255,255,255,0.25));
  letter-spacing: 1px;
  text-transform: uppercase;
  border-top: 1px solid var(--sidebar-border, rgba(255,255,255,0.06));
  margin-top: 4px;
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
```

---

### Task 6: 一分一段表视图

**新建:** `frontend/src/views/GaokaoDistribution.vue`

- [ ] **Step 1: 创建视图组件**

```vue
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
  background: var(--body-bg, #f5f5f5);
}
.data-table th {
  padding: 10px 16px;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary, #333);
  border-bottom: 1px solid var(--border-color, #eee);
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
.data-table tbody tr:last-child td {
  border-bottom: none;
}

/* 列宽 */
.col-score {
  font-weight: 600;
  width: 120px;
}
.col-num {
  text-align: right;
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
```

---

### Task 7: 历年录取分 — 大学详情视图

**新建:** `frontend/src/views/GaokaoAdmissionDetail.vue`

- [ ] **Step 1: 创建视图组件**

```vue
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

      <!-- 元信息 -->
      <div class="page-meta">
        <span class="meta-chip">📍 {{ data.university.province }}{{ data.university.city ? ' · ' + data.university.city : '' }}</span>
        <span class="meta-chip">📅 {{ data.year }}年</span>
        <span class="meta-chip">📚 {{ data.admissionProvince }} · {{ data.subjectType }}</span>
        <span v-for="tag in data.university.tags" :key="tag" class="meta-chip tag-chip">{{ tag }}</span>
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

      <!-- 录取数据 -->
      <div class="data-card">
        <div v-for="g in data.groups" :key="g.groupName" class="group-section">
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
                  <th class="col-num" v-if="g.majors.some(m => m.minRank)">最低排位</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in g.majors" :key="m.majorName">
                  <td class="col-major">{{ m.majorName }}</td>
                  <td class="col-num">{{ m.enrollmentCount || '-' }}</td>
                  <td class="col-num">{{ m.maxScore || '-' }}</td>
                  <td class="col-num">{{ m.minScore || '-' }}</td>
                  <td class="col-num">{{ m.avgScore || '-' }}</td>
                  <td class="col-num" v-if="g.majors.some(mm => mm.minRank)">{{ m.minRank || '-' }}</td>
                </tr>
              </tbody>
            </table>
            <div v-else class="empty-inline">暂无专业数据</div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/api'
import { GraduationCap } from 'lucide-vue-next'

const route = useRoute()
const loading = ref(true)
const error = ref(null)
const data = ref(null)
const collapsedGroups = ref(new Set())

const totalMajors = computed(() => {
  if (!data.value) return 0
  return data.value.groups.reduce((s, g) => s + g.majors.length, 0)
})

function toggleGroup(name) {
  const s = new Set(collapsedGroups.value)
  if (s.has(name)) s.delete(name); else s.add(name)
  collapsedGroups.value = s
}

onMounted(async () => {
  try {
    const code = route.params.code
    if (!code) {
      error.value = '大学代码无效'
      return
    }
    const result = await api.getGaokaoAdmission(code)
    if (!result) {
      error.value = '未找到该大学数据'
      return
    }
    data.value = result
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

/* 专业组 */
.group-section {
  border-bottom: 1px solid var(--border-color, #f0f0f0);
}
.group-section:last-child {
  border-bottom: none;
}
.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  background: var(--body-bg, #f9f9f9);
  transition: background 0.15s;
}
.group-header:hover {
  background: var(--body-bg, #f0f0f0);
}
.group-toggle {
  font-size: 12px;
  color: var(--text-secondary, #999);
  transition: transform 0.2s;
  line-height: 1;
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

/* 表格 */
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table thead {
  background: var(--body-bg, #f5f5f5);
}
.data-table th {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary, #333);
  border-bottom: 1px solid var(--border-color, #eee);
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
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.col-major {
  min-width: 160px;
}
.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.empty-inline {
  padding: 12px 16px;
  color: var(--text-secondary, #999);
  font-size: 13px;
  text-align: center;
}
</style>
```

---

## 实施顺序

建议按以下顺序实现（每个 Task 独立可验证）：

1. **Task 1** → 后端数据服务（可独立测试 SQLite 查询）
2. **Task 2** → 后端 API 路由（可用 curl 验证）
3. **Task 3** → 前端 API 方法
4. **Task 4** → 前端路由
5. **Task 5** → 侧栏分类（开启导航入口）
6. **Task 6** → 一分一段表视图（可独立点击查看）
7. **Task 7** → 录取分详情视图（可点击大学查看）

完成后重新构建前端并重启服务即可验证全流程。
