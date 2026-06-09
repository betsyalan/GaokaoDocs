<template>
  <iframe
    :srcdoc="content"
    sandbox="allow-same-origin allow-scripts"
    class="iframe-viewer"
  ></iframe>
</template>

<script setup>
defineProps({ content: String })
</script>

<style scoped>
.iframe-viewer {
  width: 100%;
  min-height: 80vh;
  border: none;
  background: var(--card-bg, #fff);
  border-radius: 8px;
  transition: background 0.3s;
}
</style>
