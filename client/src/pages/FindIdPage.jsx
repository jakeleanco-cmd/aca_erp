import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, List, Space } from 'antd';
import { KeyOutlined, ArrowLeftOutlined, MailOutlined, InfoCircleOutlined } from '@ant-design/icons';
import client from '../api/client';

export default function FindIdPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [foundAdmins, setFoundAdmins] = useState(null);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      // 엔드포인트를 v2로 변경하여 캐시 및 충돌 문제를 회피합니다.
      const { data } = await client.post('/auth/find-id-v2', { 
        registrationCode: values.registrationCode 
      });
      setFoundAdmins(data.admins);
      if (data.message) message.success(data.message);
    } catch (err) {
      message.error(err.response?.data?.message || '정보를 찾을 수 없습니다.');
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
      background: '#0a0e14'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Typography.Title level={2} style={{ color: '#fff', fontWeight: 800 }}>아이디 찾기</Typography.Title>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.45)' }}>가입 코드만으로 아이디를 확인합니다</Typography.Text>
      </div>

      <Card style={{ maxWidth: 450, margin: '0 auto', width: '100%', borderRadius: 16, background: '#141a23', border: '1px solid rgba(255,255,255,0.08)' }}>
        {!foundAdmins ? (
          <Form layout="vertical" onFinish={onFinish}>
            <div style={{ marginBottom: 20, padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: 8 }}>
              <Space align="start">
                <InfoCircleOutlined style={{ color: '#6366f1', marginTop: 3 }} />
                <Typography.Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  이름 입력 없이 <b>가입 코드</b>만 입력해 주세요.
                </Typography.Text>
              </Space>
            </div>

            <Form.Item 
              name="registrationCode" 
              label={<span style={{ color: 'rgba(255,255,255,0.45)' }}>가입 코드</span>}
              rules={[{ required: true, message: '가입 코드를 입력해 주세요.' }]}
              style={{ marginBottom: 32 }}
            >
              <Input 
                prefix={<KeyOutlined style={{ color: 'rgba(255,255,255,0.2)' }} />} 
                placeholder="관리자 가입 코드 입력" 
                style={{ height: 48, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                loading={loading}
                style={{ 
                  height: 50, 
                  borderRadius: 12, 
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 600
                }}
              >
                아이디 목록 확인하기
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <div>
            <Typography.Paragraph style={{ color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 24 }}>
              등록된 관리자 목록입니다:
            </Typography.Paragraph>
            <List
              dataSource={foundAdmins}
              renderItem={(admin) => (
                <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography.Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>{admin.email}</Typography.Text>
                    <Typography.Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>({admin.name} 관리자)</Typography.Text>
                  </div>
                </List.Item>
              )}
            />
            <Button 
              type="primary"
              block 
              onClick={() => navigate('/login')}
              style={{ marginTop: 32, height: 45, borderRadius: 12, background: '#31363f', border: 'none' }}
            >
              로그인하러 가기
            </Button>
          </div>
        )}
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Link to="/login" style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14 }}>
          <ArrowLeftOutlined style={{ marginRight: 8 }} /> 로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
