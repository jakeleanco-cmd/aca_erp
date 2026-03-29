import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Select, Button, Card, message, Spin, Switch, Space } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import client from '../api/client';
import { SCHOOL_LEVELS, TEXTBOOK_LEVELS } from '../constants/learning';

export default function TextbookEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      form.setFieldsValue({ chapters: [{ order: 1, title: '', hasUnitEvaluation: false }] });
      return;
    }
    (async () => {
      try {
        const { data } = await client.get(`/textbooks/${id}`);
        const chapters = (data.chapters || []).length
          ? data.chapters
          : [{ order: 1, title: '', hasUnitEvaluation: false }];
        form.setFieldsValue({ ...data, chapters });
      } catch {
        message.error('교재를 불러오지 못했습니다.');
        navigate('/textbooks');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, form, navigate]);

  const onFinish = async (values) => {
    const chapters = (values.chapters || [])
      .map((c, i) => ({
        order: c.order ?? i + 1,
        title: c.title,
        hasUnitEvaluation: !!c.hasUnitEvaluation,
      }))
      .filter((c) => c.title?.trim());
    const payload = { ...values, chapters };
    try {
      if (isNew) {
        const { data } = await client.post('/textbooks', payload);
        message.success('등록되었습니다.');
        navigate(`/textbooks/${data._id}`);
      } else {
        await client.put(`/textbooks/${id}`, payload);
        message.success('저장되었습니다.');
      }
    } catch (err) {
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <Card title={isNew ? '교재 등록' : '교재 수정'}>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 720 }}>
        <Form.Item name="publishYear" label="출판년도" rules={[{ required: true }]}>
          <InputNumber min={1990} max={2100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="schoolLevel" label="학년구분" rules={[{ required: true }]}>
          <Select options={SCHOOL_LEVELS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
        <Form.Item name="gradeLabel" label="학년" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="title" label="교재명" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="learningLevel" label="학습수준" rules={[{ required: true }]}>
          <Select options={TEXTBOOK_LEVELS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
        <Form.Item label="단원목차">
          <Form.List name="chapters">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }} wrap>
                    <Form.Item
                      {...field}
                      name={[field.name, 'order']}
                      label={index === 0 ? '순서' : undefined}
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1} placeholder="순서" />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'title']}
                      label={index === 0 ? '단원명' : undefined}
                      rules={[{ required: true, message: '단원명' }]}
                    >
                      <Input placeholder="단원 제목" style={{ width: 280 }} />
                    </Form.Item>
                    <Form.Item
                      {...field}
                      name={[field.name, 'hasUnitEvaluation']}
                      label={index === 0 ? '단원평가' : undefined}
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="있음" unCheckedChildren="없음" />
                    </Form.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ order: fields.length + 1, title: '', hasUnitEvaluation: false })} block icon={<PlusOutlined />}>
                    단원 추가
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              저장
            </Button>
            <Button onClick={() => navigate('/textbooks')}>목록</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}
