<template>
  <div class="md-wrapper" :class="`theme-${currentTheme}`">
    <div class="md-content" v-html="renderedHtml"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/github-dark.css'
import { useTheme } from '@/composables/useTheme'

// 使用 marked-highlight 扩展实现代码高亮
marked.use(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    }
  })
)

const props = defineProps({ content: String })

const { currentTheme } = useTheme()
const renderedHtml = computed(() => marked.parse(props.content || ''))
</script>

<style>
/* ========== 布局 ========== */
.md-wrapper {
  position: relative;
  padding: 40px 48px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.9;
  overflow-x: auto;
  transition: background 0.3s, color 0.3s, box-shadow 0.3s;
}

/* =====================================================
   三套主题定义（CSS 变量）
   ===================================================== */

/* ---- 琉璃蓝 · 现代简约 ---- */
.md-wrapper.theme-liuli {
  --body-bg: #f4f6f9;
  --card-bg: #ffffff;
  --card-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.05);

  --color-h1: #0a2540;
  --color-h2: #1e6bb8;
  --color-h3: #0d9488;
  --text-body: #2c3e50;

  --color-link: #1e6bb8;
  --color-accent: #1e6bb8;
  --border-subtle: #e0e8f0;

  --bg-bq: #f0f4fa;
  --border-bq: #1e6bb8;
  --color-bq: #556b84;

  --bg-code-inline: #eef2f7;
  --color-code-inline: #1e6bb8;
  --bg-code-block: #0a1a2e;
  --color-code-block: #d4e0f0;

  --bg-th: #1e3a5f;
  --color-th: #ffffff;
  --border-td: #e8edf4;
  --bg-stripe: #f8fafc;

  --color-strong: #0a2540;
  --color-hr: #c8d4e4;

  background: var(--card-bg);
  color: var(--text-body);
  box-shadow: var(--card-shadow);
}

/* ---- 琥珀橙 · 温暖现代 ---- */
.md-wrapper.theme-chenger {
  --body-bg: #f7ede0;
  --card-bg: #fffcf9;
  --card-shadow: 0 2px 4px rgba(0,0,0,0.03), 0 12px 40px rgba(0,0,0,0.06);

  --color-h1: #5c2a16;
  --color-h2: #c94f2b;
  --color-h3: #b8860b;
  --text-body: #4a3f37;

  --color-link: #c94f2b;
  --color-accent: #e8893a;
  --border-subtle: #eee5dc;

  --bg-bq: #fdf6ef;
  --border-bq: #e8893a;
  --color-bq: #7a6b5e;

  --bg-code-inline: #f6ede6;
  --color-code-inline: #c94f2b;
  --bg-code-block: #2a221c;
  --color-code-block: #e8ddd0;

  --bg-th: #5c2a16;
  --color-th: #fdf6ef;
  --border-td: #eee5dc;
  --bg-stripe: #fdf8f4;

  --color-strong: #5c2a16;
  --color-hr: #e6d5c8;

  background: var(--card-bg);
  color: var(--text-body);
  box-shadow: var(--card-shadow);
}

/* ---- 紫烟 · 优雅现代 ---- */
.md-wrapper.theme-ziyan {
  --body-bg: #ede6f0;
  --card-bg: #fcfaff;
  --card-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 8px 32px rgba(74,44,94,0.06);

  --color-h1: #2d1b3d;
  --color-h2: #7c4d9e;
  --color-h3: #c0608a;
  --text-body: #3a3042;

  --color-link: #7c4d9e;
  --color-accent: #7c4d9e;
  --border-subtle: #e8e0ee;

  --bg-bq: #f6f0fa;
  --border-bq: #7c4d9e;
  --color-bq: #6a5a78;

  --bg-code-inline: #f0eaf5;
  --color-code-inline: #7c4d9e;
  --bg-code-block: #1e1528;
  --color-code-block: #d8cce6;

  --bg-th: #2d1b3d;
  --color-th: #f0eaf5;
  --border-td: #e8e0ee;
  --bg-stripe: #f8f4fb;

  --color-strong: #2d1b3d;
  --color-hr: #d0c0de;

  background: var(--card-bg);
  color: var(--text-body);
  box-shadow: var(--card-shadow);
}

/* ========== 标题样式 ========== */
.md-content h1 {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--color-h1);
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 3px solid var(--color-accent);
}
.md-content h2 {
  font-size: 20px;
  font-weight: 600;
  color: var(--color-h2);
  margin: 32px 0 12px;
}
.md-content h3 {
  font-size: 17px;
  font-weight: 600;
  color: var(--color-h3);
  margin: 24px 0 8px;
}

/* ========== 正文与链接 ========== */
.md-content p {
  margin: 0 0 14px;
  color: var(--text-body);
}
.md-content a {
  color: var(--color-link);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s;
}
.md-content a:hover {
  border-bottom-color: var(--color-link);
}

/* ========== 列表 ========== */
.md-content ul,
.md-content ol {
  margin: 8px 0 14px;
  padding-left: 20px;
}
.md-content li {
  margin-bottom: 4px;
  color: var(--text-body);
}
.md-content li::marker {
  color: var(--color-accent);
}

/* ========== 引用 ========== */
.md-content blockquote {
  margin: 20px 0;
  padding: 16px 22px;
  background: var(--bg-bq);
  border-left: 3px solid var(--border-bq);
  border-radius: 0 6px 6px 0;
  color: var(--color-bq);
  font-size: 14px;
}
.md-content blockquote p {
  margin: 0;
  color: inherit;
}

/* ========== 代码 ========== */
/* 行内代码 */
.md-content code:not(pre code) {
  background: var(--bg-code-inline);
  color: var(--color-code-inline);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'Consolas', 'JetBrains Mono', monospace;
}
/* 代码块 */
.md-content pre {
  background: var(--bg-code-block);
  color: var(--color-code-block);
  border-radius: 8px;
  padding: 18px 22px;
  margin: 18px 0;
  overflow-x: auto;
}
.md-content pre code {
  background: none;
  padding: 0;
  font-family: 'Consolas', 'JetBrains Mono', monospace;
  font-size: 13px;
  color: inherit;
}

/* ========== 表格 ========== */
.md-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 18px 0;
  font-size: 14px;
}
.md-content th {
  background: var(--bg-th);
  color: var(--color-th);
  font-weight: 600;
  padding: 10px 14px;
  text-align: left;
  font-size: 13px;
  letter-spacing: 0.5px;
}
.md-content td {
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-td);
  color: var(--text-body);
}
.md-content tr:nth-child(even) td {
  background: var(--bg-stripe);
}

/* ========== 分割线 ========== */
.md-content hr {
  margin: 30px 0;
  border: none;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--color-hr), transparent);
}

/* ========== 强调 ========== */
.md-content strong {
  color: var(--color-strong);
  font-weight: 600;
}
.md-content img {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}
</style>
