<script setup lang="ts">
import { onMounted } from 'vue'
import ChatView from './views/chat/ChatView.vue'
import BaseToast from './components/common/BaseToast.vue'
import { warmPublicKey } from './utils/passwordCrypto'

// 进入页面预热登录公钥（每次会话只拉一次）：点开登录框时加密零等待
onMounted(() => warmPublicKey())
</script>

<template>
  <ChatView />
  <BaseToast />
</template>
