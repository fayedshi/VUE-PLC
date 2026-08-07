

import { createApp } from 'vue'
import MyApp from './MyApp.vue'
import myRouter from './router/myindex'
import { createPinia } from 'pinia'
const app = createApp(MyApp);
app.use(myRouter)
    .use(createPinia())
    .mount('#myapp')

app.directive('modifier',(element)=>{
    // console.log(event)
    element.innerText+='1';
})