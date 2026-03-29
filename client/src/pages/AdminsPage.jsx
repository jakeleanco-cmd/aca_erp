import { useEffect, useState } from 'react';
import { List, Button, Card, Typography, Modal, Form, Input, message, Space, Popconfirm, Avatar, Tag } from 'antd';
import { UserAddOutlined, DeleteOutlined, UserOutlined, MailOutlined, CalendarOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function AdminsPage() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const currentAdmin = useAuthStore((s) => s.admin);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/auth');
      setAdmins(data);
    } catch (err) {
      message.error('관리자 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdd = async (values) => {
    setLoading(true);
    try {
      await client.post('/auth/register', values);
      message.success('새 관리자가 추가되었습니다.');
      setModalOpen(false);
      form.resetFields();
      fetchAdmins();
    } catch (err) {
      message.error(err.response?.data?.message || '추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/auth/${id}`);
      message.success('관리자 계정이 삭제되었습니다.');
      fetchAdmins();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  return (
    <div style={{ paddingBottom: 60 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 800 }}>관리자 설정</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>시스템을 함께 관리할 계정을 관리합니다.</Typography.Text>
        </div>
        <Button 
          type="primary" 
          icon={<UserAddOutlined />} 
          style={{ borderRadius: 12, height: 40, background: 'var(--primary-gradient)', border: 'none' }}
          onClick={() => setModalOpen(true)}
        >
          추가
        </Button>
      </div>

      <List
        loading={loading}
        dataSource={admins}
        renderItem={(item) => (
          <Card 
            key={item._id}
            className="glass-effect"
            style={{ marginBottom: 16, borderRadius: 20, border: 'none' }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space size={16}>
                <Avatar 
                  size={48} 
                  icon={<UserOutlined />} 
                  style={{ background: item._id === currentAdmin?.id ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)' }} 
                />
                <div>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {item.name} {item._id === currentAdmin?.id && <Tag color="blue" bordered={false} style={{ marginLeft: 8, fontSize: 10 }}>나</Tag>}
                  </Typography.Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 12 }}>
                    <MailOutlined style={{ fontSize: 10 }} />
                    <span>{item.email}</span>
                  </div>
                </div>
              </Space>
              
              {item._id !== currentAdmin?.id && (
                <Popconfirm
                  title="관리자를 삭제하시겠습니까?"
                  onConfirm={() => handleDelete(item._id)}
                  okText="삭제"
                  cancelText="취소"
                >
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              )}
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
              <CalendarOutlined />
              <span>등록일: {new Date(item.createdAt).toLocaleDateString()}</span>
            </div>
          </Card>
        )}
      />

      <Modal
        title={<span style={{ fontWeight: 700 }}>새 관리자 등록</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        okText="등록하기"
        cancelText="취소"
        centered
        bodyStyle={{ paddingTop: 16 }}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input placeholder="관리자 실명" />
          </Form.Item>
          <Form.Item
            name="email"
            label="이메일"
            rules={[
              { required: true, message: '이메일을 입력하세요.' },
              { type: 'email', message: '올바른 이메일 형식이 아닙니다.' },
            ]}
          >
            <Input placeholder="example@email.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="비밀번호"
            rules={[
              { required: true, message: '비밀번호를 입력하세요.' },
              { min: 6, message: '6자 이상 입력하세요.' },
            ]}
          >
            <Input.Password placeholder="초기 비밀번호 (6자 이상)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
