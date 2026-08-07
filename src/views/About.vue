

<template>
  <h2>About Moutai established since 1797 reknowned for good taste and smell</h2>
  
</template>


<script setup>
import { onBeforeUnmount } from 'vue';

// view切换的时候，会被销毁，选中的时候再重新加载
onBeforeUnmount(()=>{
  console.log('About view being destroyed')
})
</script>

