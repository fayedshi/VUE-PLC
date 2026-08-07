x<template>
    <p class="active font">Class样式绑定</p>
    <div class="person">
        <h2>Sum: {{ sum }}</h2>
        <h2>Upper Limit: {{ countStore.upper }}</h2>
        <h2><input type="text" v-model="countStore.upper"></h2>
        <button @click="changeSum">Incrment</button> <br><br>
        <button @click="changeUpper(countStore.upper)">Change Upper Limit</button>
    </div>
</template>

<script setup>
import { reactive, ref, toRefs } from 'vue';
import { useCountStore } from './store/Count';
import { storeToRefs } from 'pinia';

// singleton
// let a = useCountStore();
// let b = useCountStore();
// console.log(a === b);

console.log(useCountStore());

let countStore = useCountStore();

const { sum, upper } = storeToRefs(countStore); //解构出来,名称与属性一致
console.log(sum.value, upper.value);
// 或者直接写 countStore.sum

function changeSum() {
    countStore.sum++;
    // sum.value++; 这样写也可以
    if (sum.value >= upper.value) {
        console.log('Back to base sum');
        sum.value = countStore.sum;
    }
}

function changeUpper(val) {
    console.log('to change', val);
    countStore.updateUpper(val) // 调用store里的action
}

</script>

<style>
.person {
    background-color: skyblue;
    box-shadow: 0 0 1opx;
    border-radius: 10px;
    padding: 20px;
}
</style>