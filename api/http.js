import axios from 'axios';
import { ElMessage } from 'element-plus';

const http = axios.create({
//   baseURL: 'http://localhost:8000', // 后端 FastAPI 地址
  baseURL: 'http-api', // 后端 FastAPI 地址
  timeout: 5000
});

// 请求拦截：附带 JWT Token
http.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// 响应拦截：处理 401 和 403 权限报错
http.interceptors.response.use(response => response, error => {
  if (error.response) {
    // if (error.response.status === 401) {
    //   ElMessage.error('登录失效，请重新登录');
    //   localStorage.clear();
    //   window.location.href = '#/login';
    // } else if (error.response.status === 403) {
    //   ElMessage.error('权限不足，无法操作');
    // } 
    // else {
    //   ElMessage.error(error.response.data.detail || '服务器开小差了');
    // }
    ElMessage.error(error.response.data.detail || '服务器开小差了')
  }
  return Promise.reject(error);
});

export default http;
