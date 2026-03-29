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
        const { data } = await client.get('/auth/has-admin');
        setHasAdmin(data.hasAdmin);
      } catch {
        message.error('서버 상태를 확인할 수 없습니다.');
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!checking && hasAdmin) {
      message.info('이미 관리자가 등록되어 있습니다. 로그인해 주세요.');
      navigate('/login', { replace: true });
    }
  }, [checking, hasAdmin, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const { data } = await client.post('/auth/register-first', values);
      setAuth(data.token, data.admin);
      message.success('관리자가 등록되었습니다.');
      navigate('/', { replace: true });
    } catch (err) {
      message.error(err.response?.data?.message || '등록에 실패했습니다.');
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
          최초 관리자 등록
        </Typography.Title>
        <Typography.Paragraph type="warning">
          데이터베이스에 관리자가 없을 때만 사용할 수 있습니다.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="email" label="이메일" rules={[{ required: true }]}>
            <Input type="email" />
          </Form.Item>
          <Form.Item name="password" label="비밀번호" rules={[{ required: true, min: 6, message: '6자 이상' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="name" label="이름">
            <Input placeholder="관리자" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={loading}>
              등록
            </Button>
          </Form.Item>
        </Form>
        <Link to="/login">로그인으로</Link>
      </Card>
    </div>
  );
}
