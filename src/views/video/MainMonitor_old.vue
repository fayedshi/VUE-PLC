<template>
  <div class="multi-monitor">
    <el-row :gutter="20">
      <!-- 一排两个，一共两排，同时看 4 个仓位的子码流 -->
      <el-col :span="6" :xs="24" class="video-col">
        <VideoWindow channelId="101" />
      </el-col>
      <el-col :span="6" :xs="24" class="video-col">
        <VideoWindow channelId="201" />
      </el-col>
      <el-col :span="6" :xs="24" class="video-col">
        <VideoWindow channelId="302" />
      </el-col>
      <el-col :span="6" :xs="24" class="video-col">
        <VideoWindow channelId="1201" />
      </el-col>
    </el-row>
  </div>
</template>
<script setup lang="ts">
import VideoWindow from '@/components/VideoWindow.vue';
</script>
<style scoped>
.video-col {
  margin-bottom: 6px;
}
</style>
