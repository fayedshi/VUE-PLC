import { computed, ref } from "vue";


export default function () {
    let sum = ref(0);

    function add() {
        sum.value++;
    }

    let bigSum = computed(() => {
        return sum.value * 100;
    })

    return { sum, add, bigSum };
}