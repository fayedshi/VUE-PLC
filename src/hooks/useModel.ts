
import { customRef, ref } from 'vue'

export default function (initVal, delay) {
    let timer;
    let modelVal = initVal
    let model = customRef((track, trigger) => {
        return {
            get() {
                console.log('get', modelVal);
                track(); // 告诉vue一旦数据更改，就要在页面上更新数据
                return modelVal;
            },
            set(val) {
                clearTimeout(timer); // 每次进入清除上一次的timer
                modelVal = val;
                timer = setTimeout(() => {
                    console.log('set', val);

                    trigger(); //告诉vue数据已经更改
                    // return modelVal;
                }, delay);

            }
        }
    })
    return { model }
}