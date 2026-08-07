import mitt from "mitt";
const emitter= mitt();

emitter.on('test',()=>{
    console.log('test is called');
})

export default emitter;