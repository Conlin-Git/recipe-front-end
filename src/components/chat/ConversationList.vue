<script setup lang="ts">
/**
 * 左侧会话列表：窄条常驻 + 抽屉式展开（浮层覆盖，不挤压消息区）。
 * 默认收起；选中会话/新对话后自动收起；点遮罩收起。
 */
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useChatStore } from '../../stores/chat'

const chatStore = useChatStore()
const { conversations, currentConversationId } = storeToRefs(chatStore)

const emit = defineEmits<{
  select: [id: number]
  create: []
  remove: [id: number]
  settings: []
}>()

// 默认收起（刷新页面保持收起态）
const collapsed = ref(true)

function handleSelect(id: number) {
  emit('select', id)
  collapsed.value = true
}

function handleCreate() {
  emit('create')
  collapsed.value = true
}
</script>

<template>
  <!-- 常驻窄条 -->
  <aside class="rail">
    <button class="icon-btn" title="展开会话列表" @click="collapsed = false">»</button>
    <button class="icon-btn" title="新对话" @click="handleCreate">＋</button>
  </aside>

  <!-- 遮罩：点击收起抽屉 -->
  <div v-if="!collapsed" class="drawer-backdrop" @click="collapsed = true"></div>

  <!-- 抽屉：浮层展开，滑入动画 -->
  <aside class="drawer" :class="{ open: !collapsed }">
    <div class="drawer-header">
      <button class="new-chat-btn" @click="handleCreate">＋ 新对话</button>
      <button class="icon-btn" title="收起会话列表" @click="collapsed = true">«</button>
    </div>

    <ul class="drawer-body">
      <li
        v-for="conv in conversations"
        :key="conv.id"
        :class="{ active: conv.id === currentConversationId }"
        :title="conv.title"
        @click="handleSelect(conv.id)"
      >
        <span class="title">{{ conv.title }}</span>
        <span class="delete" title="删除会话" @click.stop="emit('remove', conv.id)">×</span>
      </li>
      <li v-if="conversations.length === 0" class="empty">暂无历史会话</li>
    </ul>

    <button class="settings-btn" @click="emit('settings')">
      <span>⚙</span> 设置
    </button>
  </aside>
</template>

<style scoped>
/* ===== 常驻窄条（在文档流中，只占 2.75rem） ===== */
.rail {
  width: 2.75rem;
  height: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.5rem;
  box-sizing: border-box;
  border-right: 1px solid var(--border, #e5e4e7);
}

/* ===== 遮罩 ===== */
.drawer-backdrop {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.15);
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== 抽屉（浮层，不挤压消息区） ===== */
.drawer {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 60;
  width: 13.75rem;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  box-sizing: border-box;
  background: var(--bg, #fff);
  border-right: 1px solid var(--border, #e5e4e7);
  box-shadow: var(--shadow);
  /* 默认藏在左侧，open 时滑入 */
  transform: translateX(-105%);
  transition: transform 0.25s ease;
}

.drawer.open {
  transform: translateX(0);
}

.drawer-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
}

.new-chat-btn {
  flex: 1;
  min-width: 0;
  padding: 0.5rem;
  border: 1px dashed var(--border, #e5e4e7);
  border-radius: 0.5rem;
  background: transparent;
  font-family: inherit;
  color: var(--text, #6b6375);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.2s, color 0.2s;
}

.new-chat-btn:hover {
  border-color: var(--accent, #aa3bff);
  color: var(--accent, #aa3bff);
}

.icon-btn {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--text, #6b6375);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.icon-btn:hover {
  background: var(--code-bg, #f4f3ec);
  color: var(--accent, #aa3bff);
}

.drawer-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  list-style: none;
  margin: 0;
  padding: 0;
}

.drawer-body li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--text, #6b6375);
  transition: background 0.15s, color 0.15s;
}

.drawer-body li:hover {
  background: var(--code-bg, #f4f3ec);
}

.drawer-body li.active {
  background: var(--accent-bg, rgba(170, 59, 255, 0.1));
  color: var(--accent, #aa3bff);
}

.drawer-body li.empty {
  justify-content: center;
  cursor: default;
  opacity: 0.6;
}

.drawer-body li.empty:hover {
  background: transparent;
}

/* 会话标题超长省略号（flex 子元素需 min-width:0 才能收缩） */
.title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete {
  flex-shrink: 0;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  opacity: 0;
  transition: opacity 0.15s;
}

.drawer-body li:hover .delete,
.drawer-body li.active .delete {
  opacity: 0.6;
}

.delete:hover {
  opacity: 1 !important;
  color: #e5484d;
}

.settings-btn {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0.625rem;
  padding: 0.5rem;
  border: none;
  border-top: 1px solid var(--border, #e5e4e7);
  border-radius: 0.5rem;
  background: transparent;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--text, #6b6375);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, color 0.2s;
}

.settings-btn:hover {
  color: var(--accent, #aa3bff);
  background: var(--code-bg, #f4f3ec);
}
</style>
