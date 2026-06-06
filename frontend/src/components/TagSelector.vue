<template>
  <div class="tag-selector">
    <div class="tag-list">
      <span v-for="tag in tags" :key="tag" class="tag" @click="$emit('remove', tag)">
        {{ tag }} ✕
      </span>
      <span v-if="tags.length === 0" class="no-tags">无标签</span>
    </div>
    <div class="tag-input-row">
      <input
        v-model="newTag"
        @keydown.enter="addTag"
        placeholder="输入标签后回车"
        class="tag-input"
      />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({ tags: { type: Array, default: () => [] } })
const emit = defineEmits(['add', 'remove'])
const newTag = ref('')

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !props.tags.includes(tag)) {
    emit('add', tag)
  }
  newTag.value = ''
}
</script>

<style scoped>
.tag-selector { flex: 1; min-width: 200px; }
.tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.tag {
  display: inline-block;
  padding: 2px 10px;
  background: #e8f0fe;
  color: #1a73e8;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}
.tag:hover { background: #fce8e6; color: #e94560; }
.no-tags { font-size: 12px; color: #ccc; }
.tag-input { padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; width: 140px; }
.tag-input:focus { border-color: #1a73e8; outline: none; }
</style>
