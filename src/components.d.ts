import type AppIcon from './components/common/AppIcon.vue'
export {}
declare module 'vue' {
  export interface GlobalComponents { AppIcon: typeof AppIcon }
}
