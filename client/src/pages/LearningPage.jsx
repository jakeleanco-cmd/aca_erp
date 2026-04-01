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
  Popconfirm,
  Segmented,
} from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import { 
  LEARNING_TYPE_ORDER, 
  UNIT_STATUSES, 
  ASSESSMENT_TYPES,
  LEARNING_STATUSES 
} from '../constants/learning';

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
  const [filterMode, setFilterMode] = useState('진행중'); // '진행중' (완료 제외) or '전체'

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

  const saveTopic = async (learningId, chapterOrder, topicIndex, patch) => {
    try {
      await client.patch(`/learnings/${learningId}/units/${chapterOrder}/topics/${topicIndex}`, patch);
      message.success('저장되었습니다.');
      await loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  const updateStatus = async (learningId, status) => {
    try {
      await client.patch(`/learnings/${learningId}`, { status });
      message.success('상태가 업데이트되었습니다.');
      await loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || '상태 업데이트에 실패했습니다.');
    }
  };

  const deleteLearning = async (learningId) => {
    try {
      await client.delete(`/learnings/${learningId}`);
      message.success('삭제되었습니다.');
      await loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const openAssess = (learningRow, type, chapterOrder = null, initialResult = '') => {
    setAssessCtx({ studentLearningId: learningRow._id, type, chapterOrder });
    assessForm.setFieldsValue({
      type,
      chapterOrder: chapterOrder != null ? chapterOrder : undefined,
      assessedAt: dayjs(),
      result: initialResult || '',
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
      
      // 단원평가인 경우 학습 요약 정보(unitEvaluationResult)도 함께 업데이트
      if (type === '단원평가' && assessCtx.chapterOrder != null) {
        await saveUnit(assessCtx.studentLearningId, assessCtx.chapterOrder, { unitEvaluationResult: v.result });
      } else {
        await loadAll();
      }
    } catch (err) {
      if (err?.errorFields) return;
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  if (loading || !student) {
    return null;
  }

  const items = learnings
    .filter((L) => {
      if (filterMode === '진행중') return L.status !== '완료';
      return true;
    })
    .map((L) => ({
      key: L._id,
      label: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          padding: '8px 0'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
            <Tag color="blue" bordered={false} style={{ margin: 0 }}>{L.learningType}</Tag>
            <Typography.Text strong style={{ 
              fontSize: 15, 
              wordBreak: 'keep-all',
              flex: '1 1 auto'
            }}>
              {L.textbook?.title || '교재'} — {L.textbook?.gradeLabel || ''}
            </Typography.Text>
            <Tag 
              color={L.status === '완료' ? 'green' : L.status === '보류중' ? 'orange' : 'processing'} 
              bordered={false}
              style={{ margin: 0 }}
            >
              {L.status || '진행중'}
            </Tag>
          </div>
          <div 
            style={{ 
              display: 'flex', 
              justifyContent: 'flex-end', 
              alignItems: 'center', 
              gap: '8px' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <Select
              size="small"
              style={{ width: 90 }}
              value={L.status || '진행중'}
              options={LEARNING_STATUSES.map(s => ({ label: s, value: s }))}
              onChange={(v) => updateStatus(L._id, v)}
            />
            <Popconfirm
              title="학습 삭제"
              description="이 교재의 모든 학습 기록과 평가 기록이 삭제됩니다. 정말 삭제할까요?"
              onConfirm={() => deleteLearning(L._id)}
              okText="삭제"
              cancelText="취소"
              okButtonProps={{ danger: true }}
            >
              <Button 
                type="text" 
                danger 
                size="small" 
                icon={<DeleteOutlined />} 
              />
            </Popconfirm>
          </div>
        </div>
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
          scroll={{ x: 'max-content' }}
          expandable={{
            expandedRowRender: (unitRecord) => (
              <Table
                size="small"
                pagination={false}
                dataSource={unitRecord.topics || []}
                rowKey={(t, i) => i}
                columns={[
                  { title: '소주제', dataIndex: 'title', width: 200 },
                  { 
                    title: '상태', 
                    dataIndex: 'status', 
                    width: 120,
                    render: (s, t, i) => (
                      <Select
                        size="small"
                        style={{ width: '100%' }}
                        value={s}
                        options={UNIT_STATUSES.map(v => ({ value: v, label: v }))}
                        onChange={(v) => saveTopic(L._id, unitRecord.chapterOrder, i, { status: v })}
                      />
                    )
                  },
                  { 
                    title: '시작일', 
                    dataIndex: 'startedAt', 
                    width: 130,
                    render: (d, t, i) => (
                      <DatePicker
                        size="small"
                        style={{ width: '100%' }}
                        value={d ? dayjs(d) : null}
                        onChange={(v) => saveTopic(L._id, unitRecord.chapterOrder, i, { startedAt: v ? v.toISOString() : null })}
                      />
                    )
                  },
                  { 
                    title: '완료일', 
                    dataIndex: 'completedAt', 
                    width: 130,
                    render: (d, t, i) => (
                      <DatePicker
                        size="small"
                        style={{ width: '100%' }}
                        value={d ? dayjs(d) : null}
                        onChange={(v) => saveTopic(L._id, unitRecord.chapterOrder, i, { completedAt: v ? v.toISOString() : null })}
                      />
                    )
                  },
                  { 
                    title: '결과', 
                    dataIndex: 'result', 
                    width: 150,
                    render: (v, t, i) => (
                      <Input
                        size="small"
                        placeholder="점수/메모"
                        value={v}
                        onBlur={(e) => saveTopic(L._id, unitRecord.chapterOrder, i, { result: e.target.value })}
                      />
                    )
                  }
                ]}
              />
            )
          }}
          columns={[
            { 
              title: <span style={{ whiteSpace: 'nowrap' }}>순서</span>, 
              dataIndex: 'chapterOrder', 
              width: 50,
              align: 'center'
            },
            {
              title: <span style={{ whiteSpace: 'nowrap' }}>단원</span>,
              key: 't',
              render: (_, u) => {
                const ch = (L.textbook?.chapters || []).find((c) => c.order === u.chapterOrder);
                return (
                  <div style={{ 
                    minWidth: 100,
                    maxWidth: 200,
                    wordBreak: 'keep-all',
                    whiteSpace: 'normal',
                    lineHeight: '1.2',
                    fontSize: '13px'
                  }}>
                    <div style={{ fontWeight: 'bold' }}>{ch?.title || '-'}</div>
                  </div>
                );
              },
            },
            {
              title: <span style={{ whiteSpace: 'nowrap' }}>상태</span>,
              dataIndex: 'status',
              width: 120,
              render: (status, u) => (
                <Select
                  size="small"
                  style={{ width: '100%' }}
                  value={status}
                  options={UNIT_STATUSES.map((s) => ({ value: s, label: s }))}
                  onChange={(v) => saveUnit(L._id, u.chapterOrder, { status: v })}
                />
              ),
            },
            {
              title: <span style={{ whiteSpace: 'nowrap' }}>시작일</span>,
              width: 140,
              render: (_, u) => (
                <DatePicker
                  size="small"
                  style={{ width: '100%', minWidth: 110 }}
                  value={u.startedAt ? dayjs(u.startedAt) : null}
                  onChange={(d) => saveUnit(L._id, u.chapterOrder, { startedAt: d ? d.toISOString() : null })}
                />
              ),
            },
            {
              title: <span style={{ whiteSpace: 'nowrap' }}>완료일</span>,
              width: 140,
              render: (_, u) => (
                <DatePicker
                  size="small"
                  style={{ width: '100%', minWidth: 110 }}
                  value={u.completedAt ? dayjs(u.completedAt) : null}
                  onChange={(d) => saveUnit(L._id, u.chapterOrder, { completedAt: d ? d.toISOString() : null })}
                />
              ),
            },
            {
              title: <span style={{ whiteSpace: 'nowrap' }}>단원평가결과</span>,
              dataIndex: 'unitEvaluationResult',
              width: 150,
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
              title: <span style={{ whiteSpace: 'nowrap' }}>기록</span>,
              width: 80,
              align: 'center',
              render: (_, u) => (
                <Button 
                  size="small" 
                  onClick={() => openAssess(L, '단원평가', u.chapterOrder, u.unitEvaluationResult)}
                >
                  {u.unitEvaluationResult ? '수정' : '기록'}
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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Segmented
            value={filterMode}
            onChange={(v) => setFilterMode(v)}
            options={[
              { label: '진행 중인 학습', value: '진행중' },
              { label: '전체 보기', value: '전체' },
            ]}
          />
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            총 <span style={{ color: 'var(--primary-vibrant)', fontWeight: 700 }}>{items.length}</span>개의 학습
          </Typography.Text>
        </div>

        {items.length === 0 ? (
          <Card>등록된 학습이 없거나 필터와 일치하는 항목이 없습니다.</Card>
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
                label: `[${b.schoolLevel}] ${b.title} - ${b.gradeLabel} (${b.publishYear})`,
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
