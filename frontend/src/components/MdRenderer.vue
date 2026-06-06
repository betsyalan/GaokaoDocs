<template>
  <div class="md-content" v-html="renderedHtml"></div>
</template>

<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// 使用 marked-highlight 扩展实现代码高亮（marked v12+ 推荐方式）
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
const renderedHtml = computed(() => marked.parse(props.content || ''))
</script>

<style>
.md-content {
  background: #fff;
  padding: 32px;
  border-radius: 8px;
  line-height: 1.75;
  font-size: 16px;
  overflow-x: auto;
}
.md-content h1 { font-size: 28px; margin: 24px 0 12px; }
.md-content h2 { font-size: 22px; margin: 20px 0 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; }
.md-content h3 { font-size: 18px; margin: 16px 0 8px; }
.md-content p { margin: 12px 0; }
.md-content table { border-collapse: collapse; width: 100%; margin: 16px 0; }
.md-content th, .md-content td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
.md-content th { background: #f8f8f8; font-weight: bold; }
.md-content pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
.md-content code { font-family: 'Fira Code', 'Consolas', monospace; font-size: 14px; }
.md-content blockquote { border-left: 4px solid #1a73e8; padding-left: 16px; margin: 16px 0; color: #666; }
.md-content img { max-width: 100%; }
.md-content ul, .md-content ol { padding-left: 24px; margin: 12px 0; }
.md-content hr { margin: 24px 0; border: none; border-top: 1px solid #eee; }
</style>
