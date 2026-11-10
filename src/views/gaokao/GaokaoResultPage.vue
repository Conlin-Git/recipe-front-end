<script setup lang="ts">
import ResultPageLayout from '../../components/common/ResultPageLayout.vue'
import GaokaoResults from '../../components/gaokao/GaokaoResults.vue'
const emit = defineEmits<{ navigate: [page: 'home' | 'gaokao-guide' | 'gaokao-catalog'] }>()
</script>
<template><ResultPageLayout title="志愿参考结果" edit-label="修改条件" @edit="emit('navigate', 'gaokao-guide')" @home="emit('navigate', 'home')"><GaokaoResults @edit="emit('navigate', 'gaokao-guide')" @catalog="emit('navigate', 'gaokao-catalog')" /></ResultPageLayout></template>
