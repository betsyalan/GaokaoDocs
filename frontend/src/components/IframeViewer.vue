<template>
  <iframe
    :srcdoc="content"
    sandbox="allow-same-origin"
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
  background: #fff;
  border-radius: 8px;
}
</style>
