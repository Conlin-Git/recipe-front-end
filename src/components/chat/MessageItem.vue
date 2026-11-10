<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import UserAvatar from '../common/UserAvatar.vue'
import type { Message } from '../../types/chat'
import { createAnswerPresentation, presentAnswer } from '../../utils/answerPresentation'

const props = defineProps<{
  message: Message
  avatarUrl?: string | null
  /** SSE 流式输出中：内容尾部显示闪烁光标 */
  streaming?: boolean
  canRetry?: boolean
}>()

const emit = defineEmits<{
  retry: []
}>()

const bubbleRef = ref<HTMLElement>()
const presentation = createAnswerPresentation()

/** 给代码块注入复制按钮。v-html 每次更新都重建 DOM，注入的按钮会被清掉，需要重新注入 */
async function enhanceCodeBlocks() {
  await nextTick()
  const content = bubbleRef.value?.querySelector<HTMLElement>('.message-html, .message-text')
  if (content && props.message.role === 'assistant') presentAnswer(content, !!props.streaming, presentation)
  bubbleRef.value?.querySelectorAll('pre').forEach((pre) => {
    if (pre.querySelector('.code-copy-btn')) return
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'code-copy-btn'
    btn.textContent = '复制'
    pre.appendChild(btn)
  })
}

watch(() => [props.message.html, props.message.content, props.streaming], enhanceCodeBlocks, { immediate: true })

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
      <!-- assistant 消息：后端渲染好的 HTML 直接展示；
           流式中容器转 inline，让光标跟在末尾文字后而不是换行 -->
      <div
        v-if="message.html"
        class="message-html"
        :class="{ streaming }"
        v-html="message.html"
      ></div>
      <span v-else-if="message.content" class="message-text">{{ message.content }}</span>
      <span v-else class="typing"><i></i><i></i><i></i></span>
      <span v-if="streaming && (message.html || message.content)" class="cursor"></span>
      <button
        v-if="message.role === 'assistant' && canRetry && message.content"
        class="retry-btn"
        type="button"
        @click="emit('retry')"
      >
        重新回答
      </button>
    </div>
  </div>
</template>

<style scoped>
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  max-width: 92%;
  /* 新消息入场：上浮淡入，GPU 友好 */
  animation: message-in 0.25s ease-out;
}

@keyframes message-in {
  from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
  }
  to {
    opacity: 1;
    transform: translate3d(0, 0, 0);
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
  padding: 1rem 1.15rem;
  border-radius: var(--radius-card);
  line-height: 1.85;
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
  background: #2862d9;
  color: #fff;
  border-top-right-radius: 0.25rem;
}

.message-bubble.assistant {
  background: var(--surface);
  color: var(--text-h, #08060d);
  border: 1px solid var(--border);
  box-shadow: var(--surface-shadow);
  border-top-left-radius: 6px;
}

.retry-btn {
  display: block;
  margin-top: 0.625rem;
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--border, #e5e4e7);
  border-radius: 0.35rem;
  color: var(--text, #6b6375);
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
}

.retry-btn:hover {
  color: var(--accent, #aa3bff);
  border-color: var(--accent, #aa3bff);
}

/* 富文本内容排版（v-html 内部元素需用 :deep 穿透 scoped） */
.message-html {
  line-height: 1.85;
  /* 覆盖气泡的 pre-wrap：HTML 源码里标签间的换行不能再渲染成空行 */
  white-space: normal;
}

.message-html :deep(h1),
.message-html :deep(h2),
.message-html :deep(h3),
.message-html :deep(h4) {
  margin: 1.15rem 0 .5rem;
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
  margin: .6rem 0;
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

.message-html :deep(.answer-records) { margin: 1rem 0; }
.message-html :deep(.answer-record + .answer-record) { margin-top: 1.25rem; padding-top: 1rem; border-top: 1px solid var(--border); }
.message-html :deep(.answer-record p) { margin: .35rem 0; line-height: 1.8; }

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

/* 流式中 HTML 容器转 inline：光标才能接在末尾文字同一行（流式结束自动还原块级布局） */
.message-html.streaming {
  display: block;
}

/* SSE 流式光标：细竖线闪烁，跟在最后内容尾部 */
.cursor {
  display: inline-block;
  width: 1px;
  height: 1em;
  margin-left: 0.125rem;
  vertical-align: -0.125em;
  background: var(--accent);
  animation: cursor-blink 0.9s ease infinite;
}

@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
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

/* No added inline padding: highlighting does not change the original text's measure. */
.message-bubble :deep(.answer-entity) {
  color: inherit;
  border-radius: 4px;
  background: linear-gradient(180deg, transparent 12%, var(--entity-tint) 12%, var(--entity-tint) 92%, transparent 92%);
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
.message-bubble :deep(.entity-school) { --entity-tint: #dceaff; color: #204f9e; }
.message-bubble :deep(.entity-major) { --entity-tint: #e8e5fb; color: #57438c; }
.message-bubble :deep(.entity-rank) { --entity-tint: #dcf2eb; color: #17634d; font-variant-numeric: tabular-nums; }
.message-bubble :deep(.stream-char) { display: inline-block; animation: answer-char-in 240ms var(--ease-out) both; }
@keyframes answer-char-in {
  from { opacity: .25; transform: translate3d(0, 2px, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}
@media (prefers-color-scheme: dark) {
  .message-bubble :deep(.entity-school) { --entity-tint: #243d60; color: #bbd5ff; }
  .message-bubble :deep(.entity-major) { --entity-tint: #39314f; color: #ddd1ff; }
  .message-bubble :deep(.entity-rank) { --entity-tint: #213f36; color: #a4e1cc; }
}
@media (hover: none) { .message-html :deep(.code-copy-btn) { opacity: 1; } }
@media (max-width: 680px) {
  .message-row { max-width: 100%; gap: 8px; }
  .message-bubble { padding: 12px 14px; font-size: 14px; }
}
</style>
