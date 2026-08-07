<template>
    <div>
        <!-- 通过占位符params传参-->
        <ul v-for="(note, indx) in noteList" :key="indx">
            <li>
                <!-- 直接在url里写参数 -->
                <!-- <RouterLink :to="`/publics/detail/${indx}/${note}`">Notification{{ indx }} </RouterLink> -->
                <!-- 写成params对象，只能通过name,而非path -->
                <button @click="checkNotes(indx, note)">Check</button>
                <RouterLink :to="{
                    name: 'noteDetail',
                    params: {
                        id: indx,
                        note: note
                    }
                }">公告{{ indx }} </RouterLink>
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
import { useRouter } from 'vue-router';
let noteList = reactive(["Note0", 'aboard', 'meeting', 'refund', 'watermelon']);
const router = useRouter(); //编程式路由

function checkNotes(indx, note) {
    router.replace({
        name: 'noteDetail',
        params: {
            id: indx,
            note: note
        }
    });
}
</script>
