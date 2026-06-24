import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, InputNumber, Select, DatePicker, Button, Card, message, Spin, Space, Tabs } from 'antd';
import dayjs from 'dayjs';
import client from '../api/client';
import { SCHOOL_LEVELS, STUDENT_STATUSES } from '../constants/learning';
import ExamSheetsStudentTab from './ExamSheetsStudentTab';
import FormativeExamTab from './FormativeExamTab';
import MidtermPrepMatrixTab from './MidtermPrepMatrixTab';

const DATE_FORMATS = ['YYYY.MM.DD', 'YY.MM.DD', 'YYYY-MM-DD', 'YY-MM-DD', 'YYYYMMDD', 'YYMMDD'];

export default function StudentEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isNew = id === 'new' || location.pathname.endsWith('/new');
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!isNew);
  const [student, setStudent] = useState(null);
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
      const params = new URLSearchParams(location.search);
      const slotId = params.get('slotId');
      
      form.setFieldsValue({
        enrolledAt: dayjs(),
        classSlotIds: slotId ? [slotId] : [],
        status: '재원',
        cashReceiptUse: '사용',
        memo: '',
        lastCounselingContent: '',
      });
      return;
    }
    (async () => {
      try {
        const { data } = await client.get(`/students/${id}`);
        setStudent(data);
        form.setFieldsValue({
          ...data,
          enrolledAt: data.enrolledAt ? dayjs(data.enrolledAt) : null,
          leftAt: data.leftAt ? dayjs(data.leftAt) : null,
          lastCounselingAt: data.lastCounselingAt ? dayjs(data.lastCounselingAt) : null,
          lastCounselingContent: data.lastCounselingContent ?? '',
          lastStudyRecordUpdatedAt: data.lastStudyRecordUpdatedAt ? dayjs(data.lastStudyRecordUpdatedAt) : null,
          cashReceiptUse: data.cashReceiptUse ?? '사용',
          memo: data.memo ?? '',
          classSlotIds: (data.classSlotIds || []).map((s) => (typeof s === 'object' ? s._id : s)),
        });
      } catch {
        message.error('학생 정보를 불러오지 못했습니다.');
        navigate('/students');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, form, navigate, location.pathname]);

  const onFinish = async (values) => {
    const payload = {
      ...values,
      enrolledAt: values.enrolledAt?.toISOString(),
      // '퇴원' 상태가 아니면 퇴원일을 null로 강제 설정
      leftAt: values.status === '퇴원' && values.leftAt ? values.leftAt.toISOString() : null,
      lastCounselingAt: values.lastCounselingAt ? values.lastCounselingAt.toISOString() : null,
      lastStudyRecordUpdatedAt: values.lastStudyRecordUpdatedAt ? values.lastStudyRecordUpdatedAt.toISOString() : null,
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
        <Form.Item name="cashReceiptUse" label="현금영수증 발행 유무" initialValue="사용">
          <Select>
            <Select.Option value="사용">사용</Select.Option>
            <Select.Option value="미사용">미사용</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item name="enrolledAt" label="최초등록일" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} format={DATE_FORMATS} />
        </Form.Item>
        <Form.Item name="leftAt" label="퇴원일">
          <DatePicker style={{ width: '100%' }} allowClear format={DATE_FORMATS} />
        </Form.Item>
        <Form.Item name="lastCounselingAt" label="마지막 상담일">
          <DatePicker style={{ width: '100%' }} allowClear format={DATE_FORMATS} />
        </Form.Item>
        <Form.Item name="lastCounselingContent" label="마지막 상담 내용" extra="마지막 상담 관련 구체적인 학습기록 및 상담 피드백 내용을 기록해 주세요.">
          <Input.TextArea rows={6} maxLength={5000} placeholder="마지막 상담 내용 입력..." showCount />
        </Form.Item>
        <Form.Item name="lastStudyRecordUpdatedAt" label="학습기록 최종 업데이트일">
          <DatePicker style={{ width: '100%' }} allowClear format={DATE_FORMATS} />
        </Form.Item>
        <Form.Item name="memo" label="메모" extra="학생에 대한 특이사항이나 메모를 자유롭게 입력해 주세요 (300자 이상 입력 가능)">
          <Input.TextArea rows={4} maxLength={1000} placeholder="학생 특이사항 입력..." showCount />
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
    {
      key: 'formative',
      label: '형성평가',
      children: <FormativeExamTab category="형성평가" studentId={id} />,
    },
    {
      key: 'midterm-prep',
      label: '내신준비평가',
      children: <MidtermPrepMatrixTab studentId={id} student={student} />,
    },
  ];

  return (
    <Card 
      title={isNew ? '학생 등록' : `학생 상세 정보: ${student?.name || ''}`} 
      bodyStyle={{ padding: '0 24px 24px' }}
      className="glass-effect"
    >
      <Tabs defaultActiveKey="info" items={tabItems} size="large" />
    </Card>
  );
}
