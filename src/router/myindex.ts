import { createWebHistory, createRouter } from 'vue-router';

let routes = [

  {
    path: '/',
    name: 'Home',
    // component: () => import('../views/TasksView.vue'),
    // meta: { title: '任务计划' }
    // {
    // path: '', // 留空代表默认子路由，访问 / 时默认渲染此组件
    // name: 'GranLive',
    component: () => import('../views/temperature/GranLive.vue'),
    meta: { title: '首页' }
    // redirect: 'curveChart'
    // },
  },
  {
    path: '/main',
    name: 'Main',
    component: () => import('../views/SystemLayout.vue'),
    meta: { title: '系统主页' },
    children: [
      {
        path: '/temperature',
        name: 'Temperature',
        component: () => import('../views/temperature/TemperatureLayout.vue'),
        meta: { title: '测温系统' },
        children: [
          // {
          //   path: '', // 留空代表默认子路由，访问 / 时默认渲染此组件
          //   name: 'GranLive',
          //   component: () => import('../views/temperature/GranLive.vue'),
          //   meta: { title: '实时监控' }
          //   // redirect: 'curveChart'
          // },
          {
            path: 'curveChart', // 留空代表默认子路由，访问 / 时默认渲染此组件
            name: 'CurveChart',
            component: () => import('../views/temperature/TempCurveChart.vue'),
            meta: { title: '温湿度变化曲线' }
            // redirect: 'curveChart'
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
            path: 'report', // 实际访问路径：/report
            name: 'TempReport',
            component: () => import('../views/temperature/TempReportView.vue'),
            meta: { title: '综合温度报表' }
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
        path: '/gas-control',
        name: 'GasControl',
        component: () => import('../views/GasControlView.vue'),
        meta: { title: '气调系统' }
      },
      {
        path: '/ventilation',
        name: 'Ventilation',
        component: () => import('../views/VentilationView.vue'),
        meta: { title: '通风系统' }
      },
      {
        path: '/hvac',
        name: 'Hvac', // HVAC 是加热通风与空调系统的国际标准通用缩写
        component: () => import('../views/3DModelDemo.vue'),
        meta: { title: '空调系统' }
      },
      {
        path: '/power',
        name: 'Power', // HVAC 是加热通风与空调系统的国际标准通用缩写
        component: () => import('../views/power/PowerCurveChart.vue'),
        meta: { title: '能耗监测' }
      },
      {
        path: '/nitrogen-generation',
        name: 'NitrogenGeneration',
        component: () => import('../views/NitrogenGenerationView.vue'),
        meta: { title: '制氮系统' }
      },
      {
        path: '/environment-monitor',
        name: 'EnvironmentMonitor',
        component: () => import('../views/EnvironmentMonitorView.vue'),
        meta: { title: '环境监测' }
      },
    ]
  },

  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/settings/SettingsLayout.vue'),
    meta: { title: '系统设置' },
    children: [
      {
        path: '', // 留空代表默认子路由，访问 / 时默认渲染此组件
        name: 'GranaryData',
        component: () => import('../views/settings/GranaryDataEntry.vue'),
        meta: { title: '熬间信息录入' }
      }
    ]
  },
  {
    path: '/tasks',
    name: 'Tasks',
    component: () => import('../views/TasksView.vue'),
    meta: { title: '任务计划' }
  },
  {
    path: '/data-center',
    name: 'DataCenter',
    component: () => import('../views/DataCenterView.vue'),
    meta: { title: '数据中心' }
  },
  // {
  //   path: '/air-tightness',
  //   name: 'AirTightness',
  //   component: () => import('../views/AirTightnessView.vue'),
  //   meta: { title: '气密性检测' }
  // },
  // {
  //   path: '/mobile-control',
  //   name: 'MobileControl',
  //   component: () => import('../views/MobileControlView.vue'),
  //   meta: { title: '手机控制' }
  // },
  {
    path: '/alarms',
    name: 'Alarms',
    component: () => import('../views/AlarmsView.vue'),
    meta: { title: '系统报警' }
  },
  {
    path: '/permissions',
    name: 'Permissions',
    component: () => import('../views/PermissionsView.vue'),
    meta: { title: '权限管理' }
  }
]


const myRouter = createRouter({
  history: createWebHistory(),
  routes
}
)
export default myRouter;
