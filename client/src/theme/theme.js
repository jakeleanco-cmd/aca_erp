import { theme } from 'antd';

export const darkThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#6366f1', // 인디고 계열 (프리미엄 바이브런트)
    colorBgBase: '#0a0e14',
    colorBoxShadow: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
  },
  components: {
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.05)',
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
      colorBgContainer: 'rgba(255, 255, 255, 0.05)',
    },
    Menu: {
      colorItemBgSelected: 'rgba(99, 102, 241, 0.15)',
      colorItemTextSelected: '#818cf8',
    },
  },
};
