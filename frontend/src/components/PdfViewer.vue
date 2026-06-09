<template>
  <div class="pdf-viewer">
    <div class="pdf-toolbar">
      <button @click="prevPage" :disabled="currentPage <= 1">◀ 上一页</button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button @click="nextPage" :disabled="currentPage >= totalPages">下一页 ▶</button>
    </div>
    <div class="pdf-canvas-wrap">
      <canvas ref="canvasRef"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as pdfjs from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// 使用本地打包的 worker（不依赖 CDN）
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

const props = defineProps({ url: String })
const canvasRef = ref(null)
const currentPage = ref(1)
const totalPages = ref(0)
let pdfDoc = null

async function renderPage(num) {
  if (!pdfDoc || !canvasRef.value) return
  const page = await pdfDoc.getPage(num)
  const scale = 1.5
  const viewport = page.getViewport({ scale })
  const canvas = canvasRef.value
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport }).promise
}

onMounted(async () => {
  if (!props.url) return
  try {
    pdfDoc = await pdfjs.getDocument(props.url).promise
    totalPages.value = pdfDoc.numPages
    renderPage(1)
  } catch {
    console.error('PDF 加载失败')
  }
})

watch(currentPage, (page) => renderPage(page))

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<style scoped>
.pdf-viewer { background: var(--card-bg, #fff); border-radius: 8px; overflow: hidden; transition: background 0.3s; }
.pdf-toolbar {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 12px; background: var(--body-bg, #f8f8f8); border-bottom: 1px solid var(--border-color, #eee);
  transition: background 0.3s, border-color 0.3s;
}
.pdf-toolbar button {
  padding: 4px 16px;
  border: 1px solid var(--border-color, #ddd);
  border-radius: 4px;
  background: var(--card-bg, #fff);
  cursor: pointer;
  font-size: 13px;
  transition: background 0.3s, border-color 0.3s;
}
.pdf-toolbar button:hover:not(:disabled) { background: var(--body-bg, #eee); }
.pdf-toolbar button:disabled { opacity: 0.5; cursor: default; }
.page-info { font-size: 14px; color: var(--text-secondary, #666); }
.pdf-canvas-wrap { padding: 16px; text-align: center; overflow-x: auto; }
canvas { max-width: 100%; height: auto; }
</style>
