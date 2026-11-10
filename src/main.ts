import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import AppIcon from './components/common/AppIcon.vue'

createApp(App).use(createPinia()).use(ElementPlus).component('AppIcon', AppIcon).mount('#app')
