<script setup lang="ts">
import { computed, markRaw, ref, watch } from 'vue'
import HomeView from '../home/HomeView.vue'
import AssistantView from './AssistantView.vue'
import GaokaoGuidePage from '../gaokao/GaokaoGuidePage.vue'
import GaokaoCatalogPage from '../gaokao/GaokaoCatalogPage.vue'
import NamingPage from '../naming/NamingPage.vue'
import FortunePage from '../fortune/FortunePage.vue'
import FortuneResultPage from '../fortune/FortuneResultPage.vue'
import GaokaoResultPage from '../gaokao/GaokaoResultPage.vue'
import NamingResultPage from '../naming/NamingResultPage.vue'
import { useFeatureResults } from '../../stores/featureResults'
import AuthDialog from '../../components/auth/AuthDialog.vue'
import AboutDialog from '../../components/common/AboutDialog.vue'
import SettingsDialog from '../../components/settings/SettingsDialog.vue'
import { useAuthStore } from '../../stores/auth'

type PageName = 'home' | 'assistant' | 'gaokao-guide' | 'gaokao-catalog' | 'naming' | 'fortune' | 'fortune-result' | 'gaokao-result' | 'naming-result'

const activePage = ref<PageName>('home')
const authStore = useAuthStore()
const authOpen = ref(false)
const aboutOpen = ref(false)
const settingsOpen = ref(false)
const pendingPage = ref<PageName | null>(null)
const pageComponents = {
  home: markRaw(HomeView),
  assistant: markRaw(AssistantView),
  // 高考指南从主界面直接进入，避免再增加一个只负责分流的中间页。
  'gaokao-guide': markRaw(GaokaoGuidePage),
  'gaokao-catalog': markRaw(GaokaoCatalogPage),
  naming: markRaw(NamingPage),
  fortune: markRaw(FortunePage),
  'fortune-result': markRaw(FortuneResultPage),
  'gaokao-result': markRaw(GaokaoResultPage),
  'naming-result': markRaw(NamingResultPage),
}

const reports = useFeatureResults()
watch(() => authStore.user?.id, () => { reports.clear(); if (!authStore.isLoggedIn) activePage.value = 'home' })

const activeComponent = computed(() => pageComponents[activePage.value])

function navigate(page: PageName) {
  if (page !== 'home' && page !== 'assistant' && !authStore.isLoggedIn) {
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

function openAbout() {
  settingsOpen.value = false
  aboutOpen.value = true
}

function closeAbout() {
  aboutOpen.value = false
  settingsOpen.value = true
}

function handleLogout() {
  if (activePage.value !== 'assistant' && activePage.value !== 'home') activePage.value = 'home'
}
</script>

<template>
  <KeepAlive :key="authStore.user?.id || 'guest'" :max="9">
    <component :is="activeComponent" @navigate="navigate" @login="authOpen = true" @settings="settingsOpen = true" />
  </KeepAlive>
  <AuthDialog :open="authOpen" @close="closeAuth" @success="handleAuthSuccess" />
  <SettingsDialog :open="settingsOpen" @close="settingsOpen = false" @logout="handleLogout" @about="openAbout" />
  <AboutDialog :open="aboutOpen" @close="closeAbout" />
</template>
