import { useEffect, useState } from 'react';
import { Table, Button, Card, Typography, Modal, Form, Input, message, Space, Popconfirm } from 'antd';
import { UserAddOutlined, DeleteOutlined } from '@ant-design/icons';
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
      message.success('관리자가 추가되었습니다.');
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
      message.success('삭제되었습니다.');
      fetchAdmins();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '등록일',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          {record._id === currentAdmin?.id ? (
            <Typography.Text type="secondary">나</Typography.Text>
          ) : (
            <Popconfirm
              title="관리자를 삭제하시겠습니까?"
              onConfirm={() => handleDelete(record._id)}
              okText="삭제"
              cancelText="취소"
            >
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={<Typography.Title level={4}>관리자 설정</Typography.Title>}
        extra={
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => setModalOpen(true)}>
            관리자 추가
          </Button>
        }
      >
        <Table
          dataSource={admins}
          columns={columns}
          rowKey="_id"
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal
        title="새 관리자 등록"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={loading}
        okText="등록"
        cancelText="취소"
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input placeholder="관리자 이름" />
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
            <Input.Password placeholder="6자 이상 입력" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
