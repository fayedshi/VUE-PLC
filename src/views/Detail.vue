<template>
  <h2>Displaying News {{ route.query.id }}</h2>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { onUpdated, ref } from 'vue';
import { watch } from 'vue';
const route = useRoute();
// let newsId = ref(route.query.id);


onUpdated(() => {
  console.log('updated', route.query.id)
  // newsId.value = route.query.id
})

// 监听路由参数 id 的变化
// watch(() => route.query.id, (newId) => {
//   console.log('ID 变了，现在是：', newId);
//   // 在这里重新发请求获取数据
// }, { immediate: true }); // immediate 保证第一次进入也执行

</script>
