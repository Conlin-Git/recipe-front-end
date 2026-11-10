<script setup lang="ts">
defineProps<{ align?: 'start' | 'center' }>()
</script>

<template>
  <div class="filing-links" :class="{ 'filing-links-start': align === 'start' }">
    <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">粤ICP备2026143546号</a>
    <a href="https://beian.mps.gov.cn/#/query/webSearch?code=44030002019329" target="_blank" rel="noopener noreferrer">
      <img src="/beian-police.png" alt="" width="16" height="16" />
      <span>粤公网安备44030002019329号</span>
    </a>
  </div>
</template>

<style scoped>
.filing-links { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .4rem 1rem; min-width: 0; color: var(--text, #6b6375); line-height: 1.5; }
.filing-links-start { justify-content: flex-start; }
.filing-links a { display: inline-flex; align-items: center; gap: .3rem; color: inherit; text-decoration: none; white-space: nowrap; }
.filing-links a:hover { text-decoration: underline; text-underline-offset: .2rem; }
.filing-links img { flex-shrink: 0; object-fit: contain; }
</style>
