const BASE = '/api'

async function request(url, options = {}) {
  const res = await fetch(BASE + url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  // 文件
  getFiles: (type) => request(`/files?type=${type || ''}`),
  getFile: (filePath) => request(`/file/${filePath}`),

  // 搜索
  search: (q) => request(`/search?q=${encodeURIComponent(q)}`),

  // 标签
  getTags: () => request('/tags'),
  getTagMap: () => request('/tags?map=true'),
  getTagFiles: (tag) => request(`/tags/${encodeURIComponent(tag)}`),
  setTags: (file, tags) => request('/tags', {
    method: 'POST',
    body: JSON.stringify({ file, tags })
  }),

  // 统计
  getStats: () => request('/stats'),

  // 高考数据
  getGaokaoUniversities: () => request('/gaokao/universities'),
  getGaokaoAdmission: (code, year) => request(`/gaokao/admission/${code}${year ? `?year=${year}` : ''}`),
  getGaokaoDistribution: () => request('/gaokao/distribution'),

  // 管理（需要 token）
  login: (password) => request('/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password })
  }),
  upload: (formData, token) => fetch(BASE + '/admin/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData
  }),
  deleteFile: (file, token) => request('/admin/delete', {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ file })
  }),
  rename: (oldName, newName, token) => request('/admin/rename', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ oldName, newName })
  })
}
