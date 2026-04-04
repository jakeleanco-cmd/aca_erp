import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, message, Spin, Space, Tabs } from 'antd';
import dayjs from 'dayjs';
import client from '../api/client';
import { SCHOOL_LEVELS, STUDENT_STATUSES } from '../constants/learning';
import ExamSheetsStudentTab from './ExamSheetsStudentTab';

export default function StudentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!isNew);
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/class-slots');
        setSlots(data);
      } catch {
        message.error('수업 슬롯을 불러오지 못했습니다.');
      }
    })();
  }, []);

  useEffect(() => {
    if (isNew) {
      form.setFieldsValue({
        enrolledAt: dayjs(),
        classSlotIds: [],
        status: '재원',
      });
      return;
    }
    (async () => {
      try {
        const { data } = await client.get(`/students/${id}`);
        form.setFieldsValue({
          ...data,
          enrolledAt: data.enrolledAt ? dayjs(data.enrolledAt) : null,
          leftAt: data.leftAt ? dayjs(data.leftAt) : null,
          lastCounselingAt: data.lastCounselingAt ? dayjs(data.lastCounselingAt) : null,
          classSlotIds: (data.classSlotIds || []).map((s) => (typeof s === 'object' ? s._id : s)),
        });
      } catch {
        message.error('학생 정보를 불러오지 못했습니다.');
        navigate('/students');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, form, navigate]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      enrolledAt: values.enrolledAt?.toISOString(),
      // '퇴원' 상태가 아니면 퇴원일을 null로 강제 설정
      leftAt: values.status === '퇴원' && values.leftAt ? values.leftAt.toISOString() : null,
      lastCounselingAt: values.lastCounselingAt ? values.lastCounselingAt.toISOString() : null,
    };
    try {
      if (isNew) {
        const { data } = await client.post('/students', payload);
        message.success('등록되었습니다.');
        navigate(`/students/${data._id}`);
      } else {
        await client.put(`/students/${id}`, payload);
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

  const formContent = (
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 560 }}>
        <Form.Item name="name" label="이름" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="schoolLevel" label="학년구분" rules={[{ required: true }]}>
          <Select options={SCHOOL_LEVELS.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
        <Form.Item name="status" label="학생 상태" rules={[{ required: true }]}>
          <Select options={STUDENT_STATUSES.map((v) => ({ value: v, label: v }))} />
        </Form.Item>
        <Form.Item name="gradeLabel" label="학년" rules={[{ required: true }]} extra='예: "3학년", "중2" 등 학원 표기에 맞게'>
          <Input placeholder="3학년" />
        </Form.Item>
        <Form.Item name="monthlyTuition" label="월수강료(원)" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="classSlotIds" label="참여 수업시간">
          <Select
            mode="multiple"
            allowClear
            placeholder="수업 슬롯 선택"
            options={slots.map((s) => ({
              value: s._id,
              label: `${s.weekdayKo} ${s.startTime}${s.label ? ` (${s.label})` : ''}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="cashReceiptPhone" label="현금영수증 발행용 휴대폰">
          <Input placeholder="01012345678" />
        </Form.Item>
        <Form.Item name="enrolledAt" label="최초등록일" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="leftAt" label="퇴원일">
          <DatePicker style={{ width: '100%' }} allowClear />
        </Form.Item>
        <Form.Item name="lastCounselingAt" label="마지막 상담일">
          <DatePicker style={{ width: '100%' }} allowClear />
        </Form.Item>
        <Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit">
              저장
            </Button>
            <Button onClick={() => navigate('/students')}>목록</Button>
            {!isNew && (
              <Button onClick={() => navigate(`/students/${id}/learning`)} type="default">
                학습관리
              </Button>
            )}
          </Space>
        </Form.Item>
      </Form>
  );

  if (isNew) {
    return (
      <Card title="학생 등록">
        {formContent}
      </Card>
    );
  }

  const tabItems = [
    {
      key: 'info',
      label: '기본 정보',
      children: <Card style={{ border: 'none' }}>{formContent}</Card>,
    },
    {
      key: 'exam',
      label: '내신 성적',
      children: <ExamSheetsStudentTab studentId={id} />,
    },
  ];

  return (
    <Card 
      title="학생 상세 정보" 
      bodyStyle={{ padding: '0 24px 24px' }}
      className="glass-effect"
    >
      <Tabs defaultActiveKey="info" items={tabItems} size="large" />
    </Card>
  );
}
