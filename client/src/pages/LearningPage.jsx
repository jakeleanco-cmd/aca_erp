import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Select,
  DatePicker,
  Input,
  message,
  Space,
  Typography,
  Collapse,
  Tag,
} from 'antd';
import dayjs from 'dayjs';
import client from '../api/client';
import { LEARNING_TYPE_ORDER, UNIT_STATUSES, ASSESSMENT_TYPES } from '../constants/learning';

export default function LearningPage() {
  const { id: studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [learnings, setLearnings] = useState([]);
  const [textbooks, setTextbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addForm] = Form.useForm();
  const [assessOpen, setAssessOpen] = useState(false);
  const [assessForm] = Form.useForm();
  const [assessCtx, setAssessCtx] = useState(null);

  const loadAll = async () => {
    const [stu, learn, books] = await Promise.all([
      client.get(`/students/${studentId}`),
      client.get(`/learnings/by-student/${studentId}`),
      client.get('/textbooks'),
    ]);
    setStudent(stu.data);
    setLearnings(learn.data);
    setTextbooks(books.data);
  };

  useEffect(() => {
    (async () => {
      try {
        await loadAll();
      } catch {
        message.error('데이터를 불러오지 못했습니다.');
        navigate('/students');
      } finally {
        setLoading(false);
      }
    })();
  }, [studentId, navigate]);

  const openAdd = () => {
    addForm.resetFields();
    setAddOpen(true);
  };

  const submitAdd = async () => {
    try {
      const v = await addForm.validateFields();
      await client.post('/learnings', {
        student: studentId,
        learningType: v.learningType,
        textbook: v.textbook,
      });
      message.success('학습이 등록되었습니다.');
      setAddOpen(false);
      await loadAll();
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '등록에 실패했습니다.');
    }
  };

  const saveUnit = async (learningId, chapterOrder, patch) => {
    try {
      await client.patch(`/learnings/${learningId}/units/${chapterOrder}`, patch);
      message.success('저장되었습니다.');
      await loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  const openAssess = (learningRow, type, chapterOrder = null) => {
    setAssessCtx({ studentLearningId: learningRow._id, type, chapterOrder });
    assessForm.setFieldsValue({
      type,
      chapterOrder: chapterOrder != null ? chapterOrder : undefined,
      assessedAt: dayjs(),
      result: '',
      memo: '',
    });
    setAssessOpen(true);
  };

  const submitAssess = async () => {
    try {
      const v = await assessForm.validateFields();
      const type = assessCtx?.type || v.type;
      await client.post('/assessments', {
        student: studentId,
        studentLearning: assessCtx.studentLearningId,
        type,
        chapterOrder: type === '단원평가' ? Number(v.chapterOrder) : null,
        result: v.result,
        memo: v.memo || '',
        assessedAt: v.assessedAt.toISOString(),
      });
      message.success('평가가 저장되었습니다.');
      setAssessOpen(false);
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  if (loading || !student) {
    return null;
  }

  const items = learnings.map((L) => ({
    key: L._id,
    label: (
      <span>
        <Tag color="blue">{L.learningType}</Tag> {L.textbook?.title || '교재'}
      </span>
    ),
    children: (
      <div>
        <Space style={{ marginBottom: 8 }}>
          <Button size="small" onClick={() => openAssess(L, '과정평가')}>
            과정평가 기록
          </Button>
        </Space>
        <Table
          size="small"
          pagination={false}
          rowKey={(r) => r.chapterOrder}
          dataSource={L.units || []}
          columns={[
            { title: '단원순서', dataIndex: 'chapterOrder', width: 90 },
            {
              title: '단원',
              key: 't',
              render: (_, u) => {
                const ch = (L.textbook?.chapters || []).find((c) => c.order === u.chapterOrder);
                return ch?.title || '-';
              },
            },
            {
              title: '상태',
              dataIndex: 'status',
              width: 140,
              render: (status, u) => (
                <Select
                  size="small"
                  style={{ width: 120 }}
                  value={status}
                  options={UNIT_STATUSES.map((s) => ({ value: s, label: s }))}
                  onChange={(v) => saveUnit(L._id, u.chapterOrder, { status: v })}
                />
              ),
            },
            {
              title: '시작일',
              width: 160,
              render: (_, u) => (
                <DatePicker
                  size="small"
                  value={u.startedAt ? dayjs(u.startedAt) : null}
                  onChange={(d) => saveUnit(L._id, u.chapterOrder, { startedAt: d ? d.toISOString() : null })}
                />
              ),
            },
            {
              title: '완료일',
              width: 160,
              render: (_, u) => (
                <DatePicker
                  size="small"
                  value={u.completedAt ? dayjs(u.completedAt) : null}
                  onChange={(d) => saveUnit(L._id, u.chapterOrder, { completedAt: d ? d.toISOString() : null })}
                />
              ),
            },
            {
              title: '단원평가결과',
              dataIndex: 'unitEvaluationResult',
              render: (t, u) => (
                <Input
                  size="small"
                  defaultValue={t}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val !== (t || '')) {
                      saveUnit(L._id, u.chapterOrder, { unitEvaluationResult: val });
                    }
                  }}
                />
              ),
            },
            {
              title: '단원평가',
              width: 100,
              render: (_, u) => (
                <Button size="small" onClick={() => openAssess(L, '단원평가', u.chapterOrder)}>
                  기록
                </Button>
              ),
            },
          ]}
        />
      </div>
    ),
  }));

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              학습진도 — {student.name}
            </Typography.Title>
            <Typography.Text type="secondary">
              학습종류는 연산선행 → 응용선행 → 현행심화 순으로 표시됩니다.
            </Typography.Text>
          </div>
          <Space>
            <Button onClick={() => navigate(`/students/${studentId}`)}>학생 상세</Button>
            <Button type="primary" onClick={openAdd}>
              학습 등록
            </Button>
          </Space>
        </div>

        {items.length === 0 ? (
          <Card>등록된 학습이 없습니다. 「학습 등록」으로 교재를 매핑하세요.</Card>
        ) : (
          <Collapse items={items} />
        )}
      </Space>

      <Modal title="학습 등록" open={addOpen} onOk={submitAdd} onCancel={() => setAddOpen(false)} destroyOnClose>
        <Form form={addForm} layout="vertical">
          <Form.Item name="learningType" label="학습종류" rules={[{ required: true }]}>
            <Select options={LEARNING_TYPE_ORDER.map((t) => ({ value: t, label: t }))} />
          </Form.Item>
          <Form.Item name="textbook" label="교재" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={textbooks.map((b) => ({
                value: b._id,
                label: `${b.title} (${b.publishYear})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="학습평가 기록" open={assessOpen} onOk={submitAssess} onCancel={() => setAssessOpen(false)} destroyOnClose>
        <Form form={assessForm} layout="vertical">
          <Form.Item name="type" label="유형" rules={[{ required: true }]}>
            <Select options={ASSESSMENT_TYPES.map((t) => ({ value: t, label: t }))} disabled />
          </Form.Item>
          {assessCtx?.type === '단원평가' && (
            <Form.Item name="chapterOrder" label="단원 순서" rules={[{ required: true }]}>
              <Input type="number" disabled />
            </Form.Item>
          )}
          <Form.Item name="assessedAt" label="평가일" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="result" label="결과" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="점수 또는 평가 내용" />
          </Form.Item>
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
