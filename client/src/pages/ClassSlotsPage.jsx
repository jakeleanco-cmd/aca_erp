import { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Space, Typography } from 'antd';
import client from '../api/client';

const WEEKDAYS = [
  { value: 0, label: '월' },
  { value: 1, label: '화' },
  { value: 2, label: '수' },
  { value: 3, label: '목' },
  { value: 4, label: '금' },
  { value: 5, label: '토' },
  { value: 6, label: '일' },
];

export default function ClassSlotsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const load = async () => {
    const { data } = await client.get('/class-slots');
    setRows(data);
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
      } catch {
        message.error('목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ weekdayIndex: 0, startTime: '16:00' });
    setOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue(row);
    setOpen(true);
  };

  const onOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await client.put(`/class-slots/${editing._id}`, values);
        message.success('수정되었습니다.');
      } else {
        await client.post('/class-slots', values);
        message.success('등록되었습니다.');
      }
      setOpen(false);
      await load();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  const onDelete = async (row) => {
    try {
      await client.delete(`/class-slots/${row._id}`);
      message.success('삭제되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '요일',
      dataIndex: 'weekdayIndex',
      render: (v) => WEEKDAYS.find((w) => w.value === v)?.label ?? v,
    },
    { title: '시작시간', dataIndex: 'startTime' },
    { title: '표시 라벨', dataIndex: 'label' },
    {
      title: '작업',
      key: 'a',
      render: (_, r) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(r)}>
            수정
          </Button>
          <Popconfirm title="삭제할까요?" onConfirm={() => onDelete(r)}>
            <Button type="link" danger size="small">
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>수업시간 설정</h2>
        <Button type="primary" onClick={openCreate}>
          슬롯 추가
        </Button>
      </div>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        학생은 슬롯에 배정되며, 각 슬롯은 보통 2시간 수업으로 운영한다고 가정합니다.
      </Typography.Paragraph>
      <Table rowKey="_id" loading={loading} columns={columns} dataSource={rows} pagination={false} />
      <Modal
        title={editing ? '수업 슬롯 수정' : '수업 슬롯 추가'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onOk}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="weekdayIndex" label="요일" rules={[{ required: true }]}>
            <Select options={WEEKDAYS} placeholder="요일 선택" />
          </Form.Item>
          <Form.Item name="startTime" label="시작시간 (예: 16:00)" rules={[{ required: true }]}>
            <Input placeholder="16:00" />
          </Form.Item>
          <Form.Item name="label" label="표시 라벨 (선택)">
            <Input placeholder="월·금 16시" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
