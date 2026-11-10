<script lang="ts">
import { Back, Bottom, Calendar, ChatDotRound, Check, Close, Compass, CopyDocument, Delete, Document, EditPen, Fold, Grid, InfoFilled, Minus, Operation, Plus, RefreshRight, School, Search, Setting, Star, Top, Upload, User } from '@element-plus/icons-vue'
const icons = { back: Back, bottom: Bottom, calendar: Calendar, chat: ChatDotRound, check: Check, close: Close, compass: Compass, copy: CopyDocument, delete: Delete, document: Document, naming: EditPen, fold: Fold, features: Grid, info: InfoFilled, minus: Minus, menu: Operation, plus: Plus, refresh: RefreshRight, school: School, search: Search, settings: Setting, star: Star, top: Top, upload: Upload, user: User }
export type AppIconName = keyof typeof icons
</script>
<script setup lang="ts">
withDefaults(defineProps<{ name: AppIconName; size?: number }>(), { size: 18 })
</script>
<template><el-icon class="app-icon" :size="size" aria-hidden="true"><component :is="icons[name]" /></el-icon></template>
<style scoped>.app-icon { flex-shrink: 0; vertical-align: middle; line-height: 1; }</style>
