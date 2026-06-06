import { theme } from 'antd';

export const lightThemeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#4f46e5', // 인디고 계열 (프리미엄 바이브런트)
    colorBgBase: '#ffffff',
    colorBoxShadow: 'rgba(31, 38, 135, 0.06)',
    borderRadius: 12,
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  },
  components: {
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.8)',
      borderRadiusLG: 20,
    },
    Button: {
      borderRadius: 12,
      fontWeight: 600,
      controlHeight: 44, // 모바일 터치 최적화
    },
    Input: {
      controlHeight: 44,
      borderRadius: 12,
      colorBgContainer: '#ffffff',
    },
    Menu: {
      colorItemBgSelected: 'rgba(79, 70, 229, 0.1)',
      colorItemTextSelected: '#4f46e5',
    },
  },
};
