<template>
  <div class="container">
    <h1 class="page-title">管理面板</h1>

    <!-- 未登录：显示登录框 -->
    <div v-if="!token" class="login-box">
      <h2>管理员登录</h2>
      <input v-model="password" type="password" placeholder="管理密码" class="pwd-input"
        @keydown.enter="login" />
      <button @click="login" :disabled="!password" class="login-btn">登录</button>
      <div v-if="loginError" class="error-msg">{{ loginError }}</div>
    </div>

    <!-- 已登录：显示管理界面 -->
    <template v-else>
      <!-- 上传文件 -->
      <section class="section">
        <h2>📤 上传文件</h2>
        <div class="upload-area">
          <input type="file" multiple @change="uploadFiles" />
        </div>
        <div v-if="uploadMsg" class="upload-msg">{{ uploadMsg }}</div>
      </section>

      <!-- 文件管理列表 -->
      <section class="section">
        <h2>📋 文件管理</h2>
        <div v-if="files.length === 0" class="empty-state">
          <p>暂无文件</p>
        </div>
        <div v-for="f in files" :key="f.path" class="admin-row">
          <span class="admin-fname">{{ f.name }}</span>
          <TagSelector
            :tags="fileTags[f.name] || []"
            @add="(tag) => updateTags(f.name, [...(fileTags[f.name]||[]), tag])"
            @remove="(tag) => updateTags(f.name, (fileTags[f.name]||[]).filter(t => t !== tag))"
          />
          <button class="btn-danger" @click="deleteFile(f.name)">🗑 删除</button>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { api } from '@/api'
import TagSelector from '@/components/TagSelector.vue'

const token = ref(null)
const password = ref('')
const loginError = ref(null)
const files = ref([])
const fileTags = ref({})
const uploadMsg = ref('')

async function login() {
  try {
    const data = await api.login(password.value)
    token.value = data.token
    loginError.value = null
    loadData()
  } catch {
    loginError.value = '密码错误'
  }
}

async function loadData() {
  try {
    const [data, tagData] = await Promise.all([
      api.getFiles(),
      api.getTagMap()
    ])
    files.value = data.files || []
    // 加载已有标签映射 { "电气专业.md": ["电气", "高考"] }
    if (tagData.map) {
      fileTags.value = tagData.map
    }
  } catch {
    // 静默失败
  }
}

async function uploadFiles(e) {
  const selectedFiles = e.target.files
  if (!selectedFiles.length) return
  uploadMsg.value = '上传中...'
  try {
    for (const file of selectedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      await api.upload(formData, token.value)
    }
    uploadMsg.value = `✅ 成功上传 ${selectedFiles.length} 个文件`
    loadData()
  } catch {
    uploadMsg.value = '❌ 上传失败'
  }
}

async function deleteFile(name) {
  if (!confirm(`确定删除 "${name}"？此操作不可恢复。`)) return
  try {
    await api.deleteFile(name, token.value)
    files.value = files.value.filter(f => f.name !== name)
  } catch {
    alert('删除失败')
  }
}

async function updateTags(file, tags) {
  try {
    await api.setTags(file, tags)
    fileTags.value[file] = tags
  } catch {
    alert('标签更新失败')
  }
}
</script>

<style scoped>
.login-box {
  max-width: 320px;
  margin: 60px auto;
  text-align: center;
  background: var(--card-bg, #fff);
  padding: 32px;
  border-radius: 8px;
  box-shadow: var(--card-shadow, 0 2px 8px rgba(0,0,0,0.1));
}
.login-box h2 { font-size: 18px; margin-bottom: 20px; color: var(--text-primary, #1a1a2e); }
.pwd-input {
  width: 100%; padding: 10px 12px; margin-bottom: 12px;
  border: 1px solid var(--border-color, #ddd); border-radius: 4px; font-size: 16px;
  background: var(--card-bg, #fff);
}
.pwd-input:focus { border-color: var(--accent-color, #1a73e8); outline: none; }
.login-btn {
  width: 100%; padding: 10px; background: var(--accent-color, #1a73e8); color: #fff;
  border: none; border-radius: 4px; cursor: pointer; font-size: 15px;
}
.login-btn:hover { background: var(--accent-hover, #1557b0); }
.login-btn:disabled { background: #ccc; cursor: default; }

.section {
  background: var(--card-bg, #fff); padding: 20px; border-radius: 8px; margin-bottom: 16px;
  box-shadow: var(--card-shadow, 0 1px 3px rgba(0,0,0,0.1));
  transition: background 0.3s, box-shadow 0.3s;
}
.section h2 { font-size: 16px; margin-bottom: 16px; color: var(--text-primary, #1a1a2e); }
.upload-area { margin-bottom: 8px; }
.upload-msg { font-size: 13px; color: var(--text-secondary, #666); margin-top: 8px; }

.admin-row {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 0; border-bottom: 1px solid var(--border-color, #eee); flex-wrap: wrap;
}
.admin-row:last-child { border-bottom: none; }
.admin-fname { min-width: 180px; font-size: 14px; font-weight: 500; }
.btn-danger {
  padding: 4px 12px; background: #e94560; color: #fff;
  border: none; border-radius: 4px; cursor: pointer; font-size: 13px;
}
.btn-danger:hover { background: #d63851; }
</style>
