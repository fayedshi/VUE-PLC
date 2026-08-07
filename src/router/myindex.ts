import { createWebHistory, createRouter } from 'vue-router';
import Home from '@/views/Home.vue';
import News from '@/views/News.vue';
import About from '@/views/About.vue'
// import Detai from '@/views/News1.vue';
import Detail from '../views/Detail.vue';
import Publics from '@/views/Publics.vue';
import NoteDetail from '@/views/NoteDetail.vue';

let routes = [
  {
    path: '/publics',
    name: 'Publics',
    component: Publics,
    children: [
      {
        name: 'noteDetail', //好像不能重名
        path: 'detail/:id/:note?', // 占位符形式,?表示有可能null值
        component: NoteDetail
      }
    ]
  },
  {
    path: '/news',
    name: 'News',
    component: News,
    children: [
      {
        name: 'Detail',
        path: 'detail',
        component: Detail
      }
    ]
  },
  {
    path: '/',
    name: 'Home',
    component: Home
  }
  ,
  {
    path: '/about',
    name: 'About',
    component: About
  }
];


const myRouter = createRouter({
  history: createWebHistory(),
  routes
}
)
export default myRouter;
