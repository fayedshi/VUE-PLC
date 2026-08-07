<template>
    <div>
        <!-- 通过 query对象传参 -->
        <ul v-for="(news, indx) in newsList" :key="indx">
            <li>
                <RouterLink :to="{
                    path: '/news/detail',
                    query: {
                        id: indx
                    }
                }">新闻{{ indx }} </RouterLink>
            </li>
        </ul>

    </div>
    <div>
        <RouterView></RouterView>
    </div>
</template>
<script setup>
import { reactive } from 'vue';
import { RouterLink, RouterView } from 'vue-router';

let newsList = reactive(["juice", 'apple', 'bana', 'orange', 'watermelon']);
</script>
