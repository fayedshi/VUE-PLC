

import { createApp } from 'vue'
import MyApp from './MyApp.vue'
import myRouter from './router/myindex'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
const app = createApp(MyApp);
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(myRouter)
    .use(pinia)
    .mount('#myapp')

app.directive('modifier', (element) => {
    // console.log(event)
    element.innerText += '1';
})