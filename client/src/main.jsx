import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import koKR from 'antd/locale/ko_KR';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import 'dayjs/locale/ko';
import App from './App.jsx';
import './index.css';

dayjs.extend(customParseFormat);
dayjs.locale('ko');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={koKR}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
