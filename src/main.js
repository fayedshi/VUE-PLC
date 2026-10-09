

import { createApp } from 'vue'
import MyApp from './MyApp.vue'
import myRouter from './router/myindex'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import 'element-plus/dist/index.css'

// 2. 按需引入特定的组件
import {
    ElTabs,
    ElTabPane,
    ElRow,
    ElCol,
    ElInputNumber,
    ElSwitch,
    ElDialog,     // 🚀 加上这一行
    ElForm,       // 🚀 表单组件也顺便加上，防止后续报错
    ElFormItem,
    ElCard,
    ElTable,
    ElButton,
    ElInput,
    ElTag,
    ElOption,
    ElSelect,
    ElDatePicker,
    ElDescriptionsItem,
    ElDescriptions,
    ElIcon,
    ElStatistic,
    ElAside,
    ElMain,
    ElContainer,
    ElEmpty

} from 'element-plus'


const app = createApp(MyApp);
const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
app.use(ElAside).use(ElMain).use(ElContainer).use(ElEmpty)
app.use(ElTabs)
app.use(ElTabPane)
app.use(ElRow)
app.use(ElCol)
app.use(ElInputNumber)
app.use(ElSwitch)
app.use(ElDialog)     // 🚀 注册弹窗组件
app.use(ElForm)       // 🚀 注册表单
app.use(ElFormItem)   // 🚀 注册表单项
app.use(ElCard)
app.use(ElTable)
app.use(ElButton)
app.use(ElInput)
app.use(ElTag)
app.use(ElOption)
app.use(ElSelect)
app.use(ElDatePicker)
app.use(ElDescriptionsItem)
app.use(ElDescriptions)
app.use(ElIcon)
app.use(ElStatistic)
app.use(myRouter)
app.use(pinia)
    .mount('#myapp')

app.directive('modifier', (element) => {
    // console.log(event)
    element.innerText += '1';
})