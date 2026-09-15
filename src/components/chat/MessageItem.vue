<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import UserAvatar from '../common/UserAvatar.vue'
import type { Message } from '../../types/chat'

const props = defineProps<{
  message: Message
  avatarUrl?: string | null
}>()

const bubbleRef = ref<HTMLElement>()

/** 给代码块注入复制按钮。v-html 每次更新都重建 DOM，注入的按钮会被清掉，需要重新注入 */
async function enhanceCodeBlocks() {
  await nextTick()
  bubbleRef.value?.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy-btn'
    btn.textContent = '复制'
    pre.appendChild(btn)
  })
}

watch(() => props.message.html, enhanceCodeBlocks, { immediate: true })

/** 事件委托：按钮随 v-html 重建，点击监听挂在气泡容器上 */
function onBubbleClick(event: MouseEvent) {
  const btn = (event.target as HTMLElement).closest('.code-copy-btn')
  const pre = btn?.closest('pre')
  if (!btn || !pre) return
  // pre.innerText 会带上按钮文字，只取 code 内容
  const text = pre.querySelector('code')?.innerText ?? pre.innerText
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '已复制'
    setTimeout(() => {
      btn.textContent = '复制'
    }, 1500)
  })
}
</script>

<template>
  <div class="message-row" :class="message.role">
    <UserAvatar :role="message.role" :avatar-url="avatarUrl" />
    <div ref="bubbleRef" class="message-bubble" :class="message.role" @click="onBubbleClick">
      <!-- assistant 消息：后端渲染好的 HTML 直接展示 -->
      <div v-if="message.html" class="message-html" v-html="message.html"></div>
      <span v-else-if="message.content" class="message-text">{{ message.content }}</span>
      <span v-else class="typing"><i></i><i></i><i></i></span>
    </div>
  </div>
</template>

<style scoped>
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  max-width: 85%;
  /* 新消息入场：上浮淡入，GPU 友好 */
  animation: message-in 0.25s ease-out;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-row.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-row.assistant {
  align-self: flex-start;
}

.message-bubble {
  padding: 0.625rem 0.875rem;
  border-radius: 0.75rem;
  line-height: 1.6;
  font-size: 0.9375rem;
  white-space: pre-wrap;
  /* 关键：气泡是 flex 子项，默认 min-width:auto 会被长代码行撑出屏幕，
     置 0 后气泡才能被行宽约束，内部 pre 的横向滚动才生效 */
  min-width: 0;
  /* 长 URL/连续英文数字串防溢出 */
  overflow-wrap: anywhere;
  word-break: break-word;
  text-align: left;
}

.message-bubble.user {
  background: var(--accent, #aa3bff);
  color: #fff;
  border-top-right-radius: 0.25rem;
}

.message-bubble.assistant {
  background: var(--code-bg, #f4f3ec);
  color: var(--text-h, #08060d);
  border-top-left-radius: 0.25rem;
}

/* 富文本内容排版（v-html 内部元素需用 :deep 穿透 scoped） */
.message-html {
  line-height: 1.7;
  /* 覆盖气泡的 pre-wrap：HTML 源码里标签间的换行不能再渲染成空行 */
  white-space: normal;
}

.message-html :deep(h1),
.message-html :deep(h2),
.message-html :deep(h3),
.message-html :deep(h4) {
  margin: 0.75rem 0 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.4;
}

.message-html :deep(h1:first-child),
.message-html :deep(h2:first-child),
.message-html :deep(h3:first-child),
.message-html :deep(p:first-child) {
  margin-top: 0;
}

.message-html :deep(p) {
  margin: 0.375rem 0;
}

.message-html :deep(ul),
.message-html :deep(ol) {
  margin: 0.375rem 0;
  padding-left: 1.375rem;
}

.message-html :deep(li) {
  margin: 0.1875rem 0;
}

/* 步骤配图：固定 4:3 画幅预留位置（防加载时布局抖动），
   未加载完成时显示骨架微光动画，object-fit 裁切适配 */
.message-html :deep(img) {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
  margin: 0.375rem 0;
  border-radius: 0.5rem;
  background: linear-gradient(
    100deg,
    rgba(0, 0, 0, 0.04) 40%,
    rgba(0, 0, 0, 0.09) 50%,
    rgba(0, 0, 0, 0.04) 60%
  );
  background-size: 200% 100%;
  animation: img-shimmer 1.4s linear infinite;
}

@keyframes img-shimmer {
  from { background-position: 200% 0; }
  to { background-position: -200% 0; }
}

.message-html :deep(code) {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.8125rem;
  font-family: var(--mono, monospace);
  background: rgba(0, 0, 0, 0.06);
}

.message-html :deep(pre) {
  position: relative;
  margin: 0.5rem 0;
  padding: 0.75rem;
  border-radius: 0.5rem;
  /* 长行代码不撑破气泡，块内横向滚动 */
  overflow-x: auto;
  white-space: pre;
  background: rgba(0, 0, 0, 0.06);
}

.message-html :deep(pre code) {
  padding: 0;
  background: transparent;
  /* 覆盖气泡的换行规则：代码保持原样换行，长行交给 pre 滚动 */
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
}

/* 代码块复制按钮（JS 注入，事件委托在气泡容器上） */
.message-html :deep(.code-copy-btn) {
  position: absolute;
  top: 0.375rem;
  right: 0.375rem;
  padding: 0.125rem 0.5rem;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  line-height: 1.5;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.1);
  color: var(--text, #6b6375);
  opacity: 0;
  transition: opacity 0.15s;
}

.message-html :deep(pre:hover .code-copy-btn),
.message-html :deep(.code-copy-btn:focus-visible) {
  opacity: 1;
}

.message-html :deep(table) {
  border-collapse: collapse;
  margin: 0.5rem 0;
}

.message-html :deep(th),
.message-html :deep(td) {
  padding: 0.375rem 0.75rem;
  border: 1px solid var(--border, #e5e4e7);
}

.message-html :deep(blockquote) {
  margin: 0.5rem 0;
  padding: 0.25rem 0.75rem;
  border-left: 0.1875rem solid var(--accent, #aa3bff);
  color: var(--text, #6b6375);
}

.message-html :deep(p:last-child),
.message-html :deep(ul:last-child),
.message-html :deep(ol:last-child) {
  margin-bottom: 0;
}

/* 打字动画 */
.typing {
  display: inline-flex;
  gap: 0.25rem;
  padding: 0.25rem 0;
}

.typing i {
  width: 0.375rem;
  height: 0.375rem;
  border-radius: 50%;
  background: var(--text, #6b6375);
  animation: blink 1.2s infinite;
}

.typing i:nth-child(2) {
  animation-delay: 0.2s;
}

.typing i:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0%, 80%, 100% { opacity: 0.3; }
  40% { opacity: 1; }
}
</style>
