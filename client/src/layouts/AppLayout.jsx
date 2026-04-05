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
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Header, Content, Footer } = Layout;

const menuItems = [
  { key: '/timetable', icon: <CalendarOutlined />, label: '시간표' },
  { key: '/students', icon: <TeamOutlined />, label: '학생' },
  { key: '/exam-sheets', icon: <FileTextOutlined />, label: '성적' },
  { key: '/exam-papers', icon: <FolderOpenOutlined />, label: '시험지' },
  { key: '/textbooks', icon: <BookOutlined />, label: '교재' },
  { key: '/billing', icon: <DollarOutlined />, label: '수납' },
  { key: '/admins', icon: <SettingOutlined />, label: '관리' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);

  const activeKey = menuItems.find(
    (m) => location.pathname === m.key || location.pathname.startsWith(`${m.key}/`)
  )?.key ?? '/timetable';

  const currentPageLabel = menuItems.find((m) => m.key === activeKey)?.label || '학습관리';

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      {/* 프리미엄 상단 헤더 */}
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
          <div style={{ 
            width: 32, height: 32, borderRadius: 8, 
            background: 'var(--primary-gradient)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}>
            <BookOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.5 }}>{currentPageLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
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
        padding: '20px 20px 100px 20px', // 하단 내비바 공간 확보
        overflowY: 'auto' 
      }}>
        <Outlet />
      </Content>

      {/* 모바일 우선 하단 내비게이션 바 */}
      <Footer
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
                width: 60,
                color: isActive ? 'var(--primary-vibrant)' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ 
                fontSize: 22, 
                marginBottom: 4,
                transform: isActive ? 'translateY(-2px)' : 'none',
                filter: isActive ? 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.5))' : 'none'
              }}>
                {item.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
              {isActive && (
                <div style={{ 
                  width: 4, height: 4, borderRadius: '50%', 
                  background: 'var(--primary-vibrant)', marginTop: 4 
                }} />
              )}
            </div>
          );
        })}
      </Footer>
    </Layout>
  );
}
