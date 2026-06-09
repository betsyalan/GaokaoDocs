/**
 * 主题切换 composable
 * 所有主题相关状态集中管理，供侧边栏和 MdRenderer 共享
 */
import { ref, watch } from 'vue'

// 主题定义
const themeList = [
  { key: 'liuli',  label: '琉璃蓝 · 现代简约', dotColor: '#1e6bb8' },
  { key: 'chenger', label: '琥珀橙 · 温暖现代', dotColor: '#c94f2b' },
  { key: 'ziyan',  label: '紫烟 · 优雅现代',   dotColor: '#7c4d9e' },
]

// 各主题对应的 body 背景色
const bodyBgMap = {
  liuli:  '#f4f6f9',
  chenger: '#f7ede0',
  ziyan:  '#ede6f0',
}

// 当前主题（默认琥珀橙）
const currentTheme = ref(localStorage.getItem('md-theme') || 'chenger')

// 切换主题
function switchTheme(key) {
  currentTheme.value = key
  localStorage.setItem('md-theme', key)
}

// 切换时同步 body 背景和主题 class
watch(currentTheme, (key) => {
  document.body.style.background = bodyBgMap[key] || ''
  document.body.className = 'theme-' + key
}, { immediate: true })

export function useTheme() {
  return {
    themeList,
    currentTheme,
    switchTheme,
  }
}
