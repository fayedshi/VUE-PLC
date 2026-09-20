import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVentiUpperSiloStore = defineStore('ventiUpperSilo', () => {
    const startCondition = ref({
        minTotalTempDiff: 2.0,
        maxMoistureLoss: 70
    })

    const endCondition = ref({
        minTotalTempDiff: 1.0,
        maxMoistureLoss: 55
    })

    const updateConditions = (startData, endData) => {
        startCondition.value = { ...startData }
        endCondition.value = { ...endData }
    }

    return { startCondition, endCondition, updateConditions }
}, {
    // 🔥 核心核心：开启持久化
    persist: true
})
