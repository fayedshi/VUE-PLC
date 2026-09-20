import { defineStore } from "pinia";

export const useCountStore = defineStore('Count', {
    // 在action中定义的逻辑可以复用
    actions: {
        updateUpper(value) {
            console.log('upper updated in store')
            this.upper = value; // this指的是useCountStore对象   
        }

        // updateUpper:((value)=>{
        //     console.log('upper updated in store')
        //     this.upper = value; // this指的是useCountStore对象
        // })
    },

    getters: {
        bigSum(val: any) {
            return this.sum * val;
        }
    },

    state() {
        return {
            sum: 3,
            upper: 10
        };
    }
})