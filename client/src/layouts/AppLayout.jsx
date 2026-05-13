import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, theme, Badge } from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  MobileOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { useEffect } from 'react';

const { Header, Content, Sider } = Layout;

const menuItems = [
  { key: '/timetable', icon: <CalendarOutlined />, label: '시간표' },
  { key: '/students', icon: <TeamOutlined />, label: '학생' },
  { key: '/exam-sheets', icon: <FileTextOutlined />, label: '성적' },
  { key: '/exam-papers', icon: <FolderOpenOutlined />, label: '시험지' },
  { key: '/textbooks', icon: <BookOutlined />, label: '교재' },
  { key: '/billing', icon: <DollarOutlined />, label: '수납' },
  { key: '/admins', icon: <UserOutlined />, label: '관리' },
  { key: '/settings', icon: <SettingOutlined />, label: '설정' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  
  const { viewMode, toggleViewMode } = useUiStore();

  // 뷰 모드에 따라 #root 및 body 클래스 토글
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.classList.remove('view-mobile', 'view-web');
      root.classList.add(`view-${viewMode}`);
    }
    
    // 모바일 모드일 때만 배경 그라데이션 표시 (PC 모드에서는 전체 화면 사용)
    if (viewMode === 'mobile') {
      document.body.classList.add('has-bg');
    } else {
      document.body.classList.remove('has-bg');
    }
  }, [viewMode]);

  const activeKey = menuItems.find(
    (m) => location.pathname === m.key || location.pathname.startsWith(`${m.key}/`)
  )?.key ?? '/timetable';

  const currentPageLabel = menuItems.find((m) => m.key === activeKey)?.label || '학습관리';

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* PC 모드일 때만 왼쪽 사이드바 표시 */}
      {viewMode === 'web' && (
        <Sider
          width={200}
          theme="dark"
          style={{
            background: 'rgba(15, 20, 28, 0.9)',
            borderRight: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'sticky',
            top: 0,
            height: '100vh',
          }}
        >
          <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
            <div style={{ 
              width: 28, height: 28, borderRadius: 6, 
              background: 'var(--primary-gradient)', 
              display: 'flex', alignItems: 'center', justifyContent: 'center' 
            }}>
              <BookOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>ACA ERP</span>
          </div>
          <div style={{ padding: '10px 0' }}>
            {menuItems.map((item) => (
              <div
                key={item.key}
                onClick={() => navigate(item.key)}
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  color: activeKey === item.key ? 'var(--primary-vibrant)' : 'var(--text-muted)',
                  background: activeKey === item.key ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                  transition: 'all 0.2s ease',
                  borderRight: activeKey === item.key ? '3px solid var(--primary-vibrant)' : 'none',
                }}
              >
                {item.icon}
                <span style={{ fontWeight: activeKey === item.key ? 600 : 400 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </Sider>
      )}

      <Layout style={{ background: 'transparent' }}>
        {/* 상단 헤더 */}
        <Header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            width: '100%',
            height: 64,
            padding: '0 20px',
            background: 'rgba(10, 14, 20, 0.8)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {viewMode === 'mobile' && (
              <div style={{ 
                width: 32, height: 32, borderRadius: 8, 
                background: 'var(--primary-gradient)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center' 
              }}>
                <BookOutlined style={{ color: '#fff', fontSize: 18 }} />
              </div>
            )}
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>{currentPageLabel}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* 화면 모드 전환 버튼 - 더 직관적인 UI */}
            <div 
              onClick={toggleViewMode}
              style={{ 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                padding: '4px 12px',
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                color: 'var(--text-muted)'
              }}
              className="btn-tap"
            >
              {viewMode === 'mobile' ? (
                <>
                  <DesktopOutlined style={{ fontSize: 16 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>PC 모드</span>
                </>
              ) : (
                <>
                  <MobileOutlined style={{ fontSize: 16 }} />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>모바일 모드</span>
                </>
              )}
            </div>

            <Badge dot status="processing">
              <UserOutlined style={{ fontSize: 20, color: 'var(--text-muted)' }} />
            </Badge>
            <LogoutOutlined
              style={{ fontSize: 20, color: '#ff4d4f', cursor: 'pointer' }}
              onClick={() => {
                logout();
                navigate('/login');
              }}
            />
          </div>
        </Header>

        {/* 메인 콘텐츠 영역 */}
        <Content style={{ 
          padding: viewMode === 'mobile' ? '20px 20px 100px 20px' : '24px', 
          overflowY: 'auto' 
        }}>
          <div style={{ 
            maxWidth: viewMode === 'web' ? '1200px' : '100%', 
            margin: '0 auto' 
          }}>
            <Outlet />
          </div>
        </Content>

        {/* 모바일 모드일 때만 하단 내비게이션 바 표시 */}
        {viewMode === 'mobile' && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 'var(--max-app-width)',
              height: 72,
              padding: '0 10px',
              background: 'rgba(15, 20, 28, 0.95)',
              backdropFilter: 'blur(20px)',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            {menuItems.map((item) => {
              const isActive = activeKey === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => navigate(item.key)}
                  className="btn-tap"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    width: 48,
                    color: isActive ? 'var(--primary-vibrant)' : 'var(--text-muted)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ 
                    fontSize: 20, 
                    marginBottom: 2, 
                    transform: isActive ? 'translateY(-2px)' : 'none',
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' : 'none'
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                  {isActive && (
                    <div style={{ 
                      width: 4, height: 4, borderRadius: '50%', 
                      background: 'var(--primary-vibrant)', marginTop: 4 
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Layout>
    </Layout>
  );
}
