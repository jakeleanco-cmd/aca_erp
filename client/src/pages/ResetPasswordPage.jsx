import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { LockOutlined, UserOutlined, KeyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import client from '../api/client';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/reset-password', values);
      message.success(data.message);
      navigate('/login');
    } catch (err) {
      message.error(err.response?.data?.message || '비밀번호 재설정에 실패했습니다.');
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
      background: 'radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.1) 0%, rgba(10, 14, 20, 1) 100%)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Typography.Title level={2} style={{ margin: 0, fontWeight: 800 }}>비밀번호 찾기</Typography.Title>
        <Typography.Text type="secondary">가입 코드와 새 비밀번호를 입력해 주세요</Typography.Text>
      </div>

      <Card className="glass-effect" style={{ border: 'none', maxWidth: 450, margin: '0 auto', width: '100%' }}>
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
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </Form.Item>

          <Form.Item 
            name="registrationCode" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>가입 코드</span>}
            rules={[{ required: true, message: '서버 설정 시 사용한 가입 코드를 입력해 주세요.' }]}
          >
            <Input 
              prefix={<KeyOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="관리자 가입 코드" 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </Form.Item>
          
          <Form.Item 
            name="newPassword" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>새 비밀번호</span>}
            rules={[{ required: true, message: '새 비밀번호를 입력해 주세요.' }]}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="새 비밀번호" 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </Form.Item>

          <Form.Item 
            name="confirmPassword" 
            label={<span style={{ color: 'var(--text-muted)', fontSize: 13 }}>비밀번호 확인</span>}
            dependencies={['newPassword']}
            rules={[
              { required: true, message: '비밀번호를 한 번 더 입력해 주세요.' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('비밀번호가 일치하지 않습니다.'));
                },
              }),
            ]}
            style={{ marginBottom: 32 }}
          >
            <Input.Password 
              prefix={<LockOutlined style={{ color: 'var(--text-muted)' }} />} 
              placeholder="비밀번호 확인" 
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
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
                background: 'var(--primary-gradient)', 
                border: 'none',
                fontSize: 16,
                fontWeight: 700
              }}
            >
              비밀번호 재설정하기
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 16 }}>
        <Link to="/login" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          <ArrowLeftOutlined style={{ marginRight: 8 }} /> 로그인으로 돌아가기
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        <Link to="/find-id" style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          아이디 찾기
        </Link>
      </div>
    </div>
  );
}
