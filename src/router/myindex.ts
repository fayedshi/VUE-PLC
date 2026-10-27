import UserManagement from '../views/user/UserManagement.vue';
import { ElMessage } from 'element-plus';
import { createWebHistory, createRouter } from 'vue-router';

let routes = [

  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '登录' }
    // redirect: 'curveChart'
    // },
  },
  {
    path: '/changePass',
    name: 'ChangePass',
    component: () => import('../views/user/PassChange.vue'),
    meta: { title: '修改密码', requiresAuth: true }
    // redirect: 'curveChart'
    // },
  },
  {
    path: '/',
    name: 'MainLayout',
    component: () => import('../views/MainLayout.vue'),
    meta: { title: '首页', requiresAuth: true },
    // redirect: 'curveChart'
    // },
    children: [
      {
        path: '',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '看板' }
      },
      {
        path: 'users',
        name: 'Users',
        component: UserManagement,
        meta: { requiresAuth: true }
      },
      {
        path: 'system',
        name: 'System',
        component: () => import('../views/SystemLayout.vue'),
        meta: { title: '系统主页', requiresAuth: true },
        children: [
          {
            path: 'temperature',
            name: 'Temperature',
            component: () => import('../views/temperature/TemperatureLayout.vue'),
            meta: { title: '测温系统', requiresAuth: true },
            redirect: '/system/temperature',
            children: [
              {
                path: 'curveChart', 
                name: 'CurveChart',
                component: () => import('../views/temperature/TempCurveChart.vue'),
                meta: { title: '温湿度变化曲线', requiresAuth: true }

              },
              {
                path: 'comparison', // 实际访问路径：/comparison
                name: 'TempComparison',
                component: () => import('../views/temperature/TempComparisonView.vue'),
                meta: { title: '粮情点位比较' }
              },
              {
                path: 'slice-3d', // 实际访问路径：/slice-3d
                name: 'TempSlice3D',
                component: () => import('../views/temperature/TempSlice3DView.vue'),
                meta: { title: '三维粮温切面图' }
              },
              {
                path: '', // 实际访问路径：/report
                name: 'TempReport',
                component: () => import('../views/temperature/TempReportView.vue'),
                meta: { title: '综合温度报表', requiresAuth: true }
              },
              {
                path: 'area-analysis', // 实际访问路径：/area-analysis
                name: 'TempAreaAnalysis',
                component: () => import('../views/temperature/TempAreaAnalysisView.vue'),
                meta: { title: '区域粮温分析表' }
              },
              {
                path: 'heatmap', // 实际访问路径：/heatmap
                name: 'TempHeatmap',
                component: () => import('../views/temperature/TempHeatmapView.vue'),
                meta: { title: '温度云图' }
              }
            ]
          },
          {
            path: 'gas-control',
            name: 'GasControl',
            component: () => import('../views/GasControlView.vue'),
            meta: { title: '气调test系统' }
          },
          {
            path: 'ventilation',
            name: 'Ventilation',
            component: () => import('../views/ventilation/VentilationLayout.vue'),
            meta: { title: '通风系统' },
            redirect: '/system/ventilation',
            children: [
              {
                path: '', 
                name: 'VentiTaskPanel',
                component: () => import('../views/ventilation/VentiTaskPanel.vue'),
                meta: { title: '作业控制面板' }
              },
              {
                path: 'ventiManual', 
                name: 'VentiMnaual',
                component: () => import('../views/ventilation/VentiManualPanel.vue'),
                meta: { title: '手动控制面板' }
              },
              {
                path: 'ventiManual3D', 
                name: 'VentiManual3D',
                component: () => import('../views/ventilation/Door3DDemo_fbx.vue'),
                meta: { title: '控制面板3D' }
              },
              {
                path: 'door3DDemo', 
                name: 'door3DDemo',
                component: () => import('../views/ventilation/Door3DDemo_glb.vue'),
                meta: { title: '门板3D' }
              },
              {
                path: 'doorGroup', 
                name: 'DoorGroup',
                component: () => import('../views/ventilation/DoorGroup.vue'),
                meta: { title: '门板3D' }
              },
              {
                path: 'deviceGroup', 
                name: 'DeviceGroup',
                component: () => import('../views/ventilation/DeviceGroup.vue'),
                meta: { title: '多3D设备tab' }
              }

            ]
          },
          {
            path: 'silo-access',
            name: 'SiloAccess',
            component: () => import('../views/SiloAccess/SiloEntryLogs.vue'),
            meta: { title: '查粮门禁模块' }
          },
          // {
          //   path: 'hvac',
          //   name: 'Hvac', // HVAC 是加热通风与空调系统的国际标准通用缩写
          //   component: () => import('../components/WindowScene.vue'),
          //   meta: { title: '3D系统' }
          // },
          {
            path: 'power',
            name: 'Power',
            component: () => import('../views/power/PowerCurveChart.vue'),
            meta: { title: '能耗监测' }
          },
          {
            path: 'ca',
            name: 'CA',
            component: () => import('../views/CA/CALayout.vue'),
            meta: { title: '气调系统' },
            redirect: '/system/ca',
            children: [
              {
                path: '', 
                name: 'GasMonitor',
                component: () => import('../views/CA/GasMonitor.vue'),
                meta: { title: '气体检测' }
              },
              // {
              //   path: 'gasHistory', 
              //   name: 'GasHistory',
              //   component: () => import('../views/CA/GasHistory.vue'),
              //   meta: { title: '历史气体' }
              // },
              {
                path: 'caJobConsole', 
                name: 'CAJobConsole',
                component: () => import('../views/CA/CAJobConsole.vue'),
                meta: { title: '气调作业控制面板' }
              }
            ]
          },
          {
            path: 'video',
            name: 'SecurityMonitor',
            component: () => import('../views/video/MainMonitor.vue'),
            meta: { title: '安防监控' }
          },
          {
            path: 'power-supply',
            name: 'PowerSupply',
            component: () => import('../views/solar/PowerSupply.vue'),
            meta: { title: '太阳能供电' }
          }

        ]
      },

      {
        path: 'settings',
        name: 'Settings',
        component: () => import('../views/settings/SettingsLayout.vue'),
        meta: { title: '系统设置' },
        children: [
          {
            path: '', 
            name: 'GranaryData',
            component: () => import('../views/settings/GranaryDataEntry.vue'),
            meta: { title: '熬间信息录入' }
          },
          {
            path: 'venti',
            name: 'VentiMode',
            component: () => import('../views/settings/VentilationMode.vue'),
            meta: { title: '通风模式设置' }
          },
          {
            path: 'ca',
            name: 'CAMode',
            component: () => import('../views/settings/CAMode.vue'),
            meta: { title: '气调模式设置' }
          }
        ]
      },
      {
        path: 'tasks',
        name: 'Tasks',
        component: () => import('../views/TaskBoard.vue'),
        meta: { title: '作业信息查询' }
      },
      {
        path: 'alarms',
        name: 'Alarms',
        component: () => import('../views/alarms/Alarms.vue'),
        meta: { title: '系统报警' }
      },
      {
        path: 'permissions',
        name: 'Permissions',
        component: () => import('../views/PermissionsView.vue'),
        meta: { title: '权限管理' }
      }
    ]
  }]


const myRouter = createRouter({
  history: createWebHistory(),
  routes
}
)

myRouter.beforeEach((to, from) => {
  const token = localStorage.getItem('token');
  // console.log('my router token:',token)
  // 如果去往需要登录的页面，但本地没有 token
  if (to.meta.requiresAuth && !token) {
    ElMessage.warning('请先登录系统');
    return ('/login'); // 强制跳转到登录页
  }
  // 如果已经登录了，还想去登录页，直接把它拉回首页
  else if (to.path === '/login' && token) {
    return ('/');
  }
  // 其他情况正常放行
  // else {
  //   next();
  // }
});
export default myRouter;
