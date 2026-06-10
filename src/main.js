import './assets/main.css'

import router from './router'
import { createApp } from 'vue'
import App from './App.vue'
import './assets/styles/reset.css'
import './assets/base.css'

createApp(App)
    .use(router)
    .mount('#app')
