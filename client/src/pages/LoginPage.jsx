import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined, UserOutlined, ArrowRightOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const token = useAuthStore((s) => s.token);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/login', values);
      setAuth(data.token, data.admin);
      message.success('반갑습니다! 로그인되었습니다.');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.response?.data?.message || '로그인 정보를 확인해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px',
      background: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.1) 0%, rgba(10, 14, 20, 1) 100%)',
      maxWidth: 'var(--max-app-width)',
      width: '100%',
      margin: '0 auto'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ 
          width: 64, height: 64, borderRadius: 20, 
          background: 'var(--primary-gradient)', 
          margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(99, 102, 241, 0.4)'
        }}>
          <LockOutlined style={{ fontSize: 32, color: '#fff' }} />
        </div>
        <Typography.Title level={2} style={{ margin: 0, fontWeight: 800 }}>관리자 로그인</Typography.Title>
        <Typography.Text type="secondary">학원 소속 관리자 계정으로 접속하세요</Typography.Text>
      </div>

      <Card className="glass-effect" style={{ border: 'none' }}>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item 
            name="email" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>아이디 (이메일)</span>}
            rules={[{ required: true, message: '아이디(이메일)를 입력해 주세요.' }]}
          >
            <Input 
              prefix={<UserOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="example@email.com" 
              type="email"
              autoComplete="email"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </Form.Item>
          
          <Form.Item 
            name="password" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>비밀번호</span>}
            rules={[{ required: true, message: '비밀번호를 입력해 주세요.' }]}
            style={{ marginBottom: 32 }}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="••••••••" 
              autoComplete="current-password"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              icon={<ArrowRightOutlined />}
              style={{ 
                height: 54, 
                borderRadius: 16, 
                background: 'var(--primary-gradient)', 
                border: 'none',
                fontSize: 16,
                fontWeight: 700
              }}
            >
              로그인하기
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/find-id" style={{ flex: 1 }}>
            <Button
              block
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                height: 44,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              아이디 찾기
            </Button>
          </Link>
          <Link to="/reset-password" style={{ flex: 1 }}>
            <Button
              block
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
                borderRadius: 12,
                height: 44,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              비밀번호 찾기
            </Button>
          </Link>
        </div>
        <Link to="/register-first">
          <Button
            block
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.45)',
              borderRadius: 12,
              height: 40,
              fontSize: 13,
            }}
          >
            계정이 없으신가요? &nbsp;<span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>관리자 가입</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
