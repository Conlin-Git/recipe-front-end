<script setup lang="ts">
import { computed, markRaw, ref } from 'vue'
import HomeView from '../home/HomeView.vue'
import AssistantView from './AssistantView.vue'
import GaokaoPage from '../gaokao/GaokaoPage.vue'
import AuthDialog from '../../components/auth/AuthDialog.vue'
import { useAuthStore } from '../../stores/auth'

type PageName = 'home' | 'assistant' | 'gaokao'

const activePage = ref<PageName>('home')
const authStore = useAuthStore()
const authOpen = ref(false)
const pendingPage = ref<PageName | null>(null)
const pageComponents = {
  home: markRaw(HomeView),
  assistant: markRaw(AssistantView),
  gaokao: markRaw(GaokaoPage),
}

const activeComponent = computed(() => pageComponents[activePage.value])

function navigate(page: PageName) {
  if (page !== 'home' && !authStore.isLoggedIn) {
    pendingPage.value = page
    authOpen.value = true
    return
  }
  activePage.value = page
}

function handleAuthSuccess() {
  const nextPage = pendingPage.value
  pendingPage.value = null
  authOpen.value = false
  if (nextPage) activePage.value = nextPage
}

function closeAuth() {
  authOpen.value = false
  pendingPage.value = null
}
</script>

<template>
  <KeepAlive :max="3">
    <component :is="activeComponent" @navigate="navigate" />
  </KeepAlive>
  <AuthDialog :open="authOpen" @close="closeAuth" @success="handleAuthSuccess" />
</template>
