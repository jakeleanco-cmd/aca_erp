import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Spin } from 'antd';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function RegisterFirstPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [checking, setChecking] = useState(true);
  const [hasAdmin, setHasAdmin] = useState(true);
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
      message.success('관리자로 가입되었습니다.');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.response?.data?.message || '가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={{ textAlign: 'center', marginTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '80px auto', padding: 16 }}>
      <Card>
        <Typography.Title level={3} style={{ textAlign: 'center' }}>
          관리자 가입
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>
          관리자로 가입하려면 할당된 가입 코드가 필요합니다.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="이메일" rules={[{ required: true, message: '이메일을 입력하세요.' }]}>
            <Input type="email" placeholder="example@email.com" />
          </Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{ required: true, min: 6, message: '6자 이상 입력하세요.' }]}>
            <Input.Password placeholder="6자 이상" />
          </Form.Item>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input placeholder="실명 또는 닉네임" />
          </Form.Item>
          <Form.Item
            name="registrationCode"
            label="가입 코드"
            rules={[{ required: true, message: '가입 코드를 입력하세요.' }]}
          >
            <Input.Password placeholder="전달받은 가입 코드" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              가입하기
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          <Link to="/login">이미 계정이 있나요? 로그인</Link>
        </div>
      </Card>
    </div>
  );
}
