import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/es/locale/zh_CN';
import App from './App';
import './utils/api';  // 引入API配置
import 'antd/dist/antd.css';  // 引入 antd 样式
import './index.css';

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <ConfigProvider locale={zhCN}>
    <App />
  </ConfigProvider>
); 