import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Spin, Space } from 'antd';
import { UserAddOutlined, ArrowLeftOutlined, KeyOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function RegisterFirstPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await client.get('/auth/has-admin');
      } catch {
        message.error('서버 상태를 확인할 수 없습니다.');
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/register-first', values);
      setAuth(data.token, data.admin);
      message.success('반갑습니다! 관리자로 가입되었습니다.');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.response?.data?.message || '가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0e14' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '24px',
      background: 'radial-gradient(circle at 90% 10%, rgba(99, 102, 241, 0.1) 0%, rgba(10, 14, 20, 1) 100%)'
    }}>
      <div style={{ marginBottom: 32 }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/login')}
          style={{ color: 'var(--text-muted)' }}
        >
          뒤로가기
        </Button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ 
          width: 56, height: 56, borderRadius: 16, 
          background: 'linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%)', 
          margin: '0 auto 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 16px rgba(6, 182, 212, 0.3)'
        }}>
          <UserAddOutlined style={{ fontSize: 28, color: '#fff' }} />
        </div>
        <Typography.Title level={2} style={{ margin: 0, fontWeight: 800 }}>관리자 가입</Typography.Title>
        <Typography.Text type="secondary">학원 운영을 위한 새 계정을 만드세요</Typography.Text>
      </div>

      <Card className="glass-effect" style={{ border: 'none' }}>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item 
            name="name" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>이름</span>}
            rules={[{ required: true, message: '이름을 입력해 주세요.' }]}
          >
            <Input 
              prefix={<UserAddOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="실명 또는 닉네임" 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </Form.Item>

          <Form.Item 
            name="email" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>이메일</span>}
            rules={[
              { required: true, message: '이메일을 입력해 주세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' }
            ]}
          >
            <Input 
              prefix={<MailOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="example@email.com" 
              type="email"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </Form.Item>
          
          <Form.Item 
            name="password" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>비밀번호</span>}
            rules={[
              { required: true, message: '비밀번호를 입력해 주세요.' },
              { min: 6, message: '6자 이상 입력하세요.' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="6자 이상 입력" 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </Form.Item>

          <Form.Item 
            name="registrationCode" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>가입 코드</span>}
            rules={[{ required: true, message: '할당받은 가입 코드를 입력하세요.' }]}
            style={{ marginBottom: 32 }}
          >
            <Input.Password 
              prefix={<KeyOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="전달받은 가입 코드 입력" 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button 
              type="primary" 
              htmlType="submit" 
              block 
              loading={loading}
              style={{ 
                height: 54, 
                borderRadius: 16, 
                background: 'linear-gradient(135deg, #06b6d4 0%, #4f46e5 100%)', 
                border: 'none',
                fontSize: 16,
                fontWeight: 700
              }}
            >
              가입 완료하기
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Typography.Text style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          가입 시 서비스 이용 약관에 동의하게 됩니다.
        </Typography.Text>
      </div>
    </div>
  );
}
