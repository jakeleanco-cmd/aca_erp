import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, theme } from 'antd';
import {
  CalendarOutlined,
  TeamOutlined,
  BookOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  { key: '/timetable', icon: <CalendarOutlined />, label: '수업시간표' },
  { key: '/students', icon: <TeamOutlined />, label: '학생관리' },
  { key: '/textbooks', icon: <BookOutlined />, label: '교재관리' },
  { key: '/class-slots', icon: <ClockCircleOutlined />, label: '수업시간 설정' },
  { key: '/billing', icon: <DollarOutlined />, label: '월별 수납' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const admin = useAuthStore((s) => s.admin);
  const logout = useAuthStore((s) => s.logout);
  const {
    token: { colorBgContainer },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100%' }}>
      <Sider breakpoint="lg" collapsedWidth={0}>
        <div
          style={{
            height: 48,
            margin: 16,
            color: '#fff',
            fontWeight: 700,
            fontSize: 15,
            lineHeight: '48px',
            textAlign: 'center',
          }}
        >
          학습관리
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[
            menuItems.find(
              (m) => location.pathname === m.key || location.pathname.startsWith(`${m.key}/`)
            )?.key ?? '/timetable',
          ]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 24px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16 }}>학원 원생 학습관리</span>
          <span>
            <span style={{ marginRight: 16 }}>{admin?.name || admin?.email}</span>
            <LogoutOutlined
              role="button"
              aria-label="로그아웃"
              onClick={() => {
                logout();
                navigate('/login');
              }}
            />
          </span>
        </Header>
        <Content style={{ margin: 24, padding: 24, background: colorBgContainer, minHeight: 360 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
