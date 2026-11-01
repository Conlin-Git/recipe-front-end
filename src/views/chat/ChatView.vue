<script setup lang="ts">
import { computed, markRaw, ref } from 'vue'
import HomeView from '../home/HomeView.vue'
import AssistantView from './AssistantView.vue'
import GaokaoGuidePage from '../gaokao/GaokaoGuidePage.vue'
import GaokaoCatalogPage from '../gaokao/GaokaoCatalogPage.vue'
import AuthDialog from '../../components/auth/AuthDialog.vue'
import { useAuthStore } from '../../stores/auth'

type PageName = 'home' | 'assistant' | 'gaokao-guide' | 'gaokao-catalog'

const activePage = ref<PageName>('home')
const authStore = useAuthStore()
const authOpen = ref(false)
const pendingPage = ref<PageName | null>(null)
const pageComponents = {
  home: markRaw(HomeView),
  assistant: markRaw(AssistantView),
  // 高考指南从主界面直接进入，避免再增加一个只负责分流的中间页。
  'gaokao-guide': markRaw(GaokaoGuidePage),
  'gaokao-catalog': markRaw(GaokaoCatalogPage),
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
    <component :is="activeComponent" @navigate="navigate" @login="authOpen = true" />
  </KeepAlive>
  <AuthDialog :open="authOpen" @close="closeAuth" @success="handleAuthSuccess" />
</template>
