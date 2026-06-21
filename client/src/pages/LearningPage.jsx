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

const DATE_FORMATS = ['YYYY.MM.DD', 'YY.MM.DD', 'YYYY-MM-DD', 'YY-MM-DD', 'YYYYMMDD', 'YYMMDD'];

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
  const [editCounseling, setEditCounseling] = useState(false);
  const [editStudyRecord, setEditStudyRecord] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState([]);
  const [expandedUnitKeys, setExpandedUnitKeys] = useState({});

  // 마지막 상담일, 학습기록 최종 업데이트일 경과 포맷 함수
  const getElapsedText = (dateString) => {
    if (!dateString) return '기록 없음';
    const start = dayjs(dateString);
    const today = dayjs();
    const months = today.diff(start, 'month');
    const tempDate = start.add(months, 'month');
    const days = today.diff(tempDate, 'day');
    
    const dateFormatted = start.format('YYYY.MM.DD');
    if (months > 0) {
      return `${dateFormatted} (${months}개월 ${days}일 전)`;
    }
    return `${dateFormatted} (${days}일 전)`;
  };

  // 교재 선택 필터 (모달 내)
  const [bookFilterSchool, setBookFilterSchool] = useState(null);
  const [bookFilterGrade, setBookFilterGrade] = useState(null);
  const [bookFilterLevel, setBookFilterLevel] = useState(null);

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

  useEffect(() => {
    if (student && learnings.length > 0) {
      // 1. '학습중'인 단원이 있는 교재(Collapse) 자동 펼침
      const activeLearningIds = learnings
        .filter(L => (L.units || []).some(u => u.status === '학습중'))
        .map(L => L._id);

      const savedIds = student.expandedLearningIds || [];
      const combined = Array.from(new Set([...savedIds, ...activeLearningIds]));
      setExpandedKeys(combined);

      // 2. '학습중' 상태인 단원(테이블 행) 자동 펼침
      setExpandedUnitKeys(prev => {
        const newUnitKeys = { ...prev };
        learnings.forEach(L => {
          const activeChapters = (L.units || [])
            .filter(u => u.status === '학습중')
            .map(u => u.chapterOrder);
          const existing = prev[L._id] || [];
          newUnitKeys[L._id] = Array.from(new Set([...existing, ...activeChapters]));
        });
        return newUnitKeys;
      });
    }
  }, [student, learnings]);

  const handleCollapseChange = async (keys) => {
    const keysArray = Array.isArray(keys) ? keys : [keys].filter(Boolean);
    setExpandedKeys(keysArray);
    try {
      await client.put(`/students/${studentId}`, {
        expandedLearningIds: keysArray
      });
    } catch (err) {
      console.error('아코디언 상태 동기화 실패:', err);
    }
  };

  const handleUnitExpand = (learningId, keys) => {
    setExpandedUnitKeys(prev => ({
      ...prev,
      [learningId]: keys
    }));
  };

  const openAdd = () => {
    addForm.resetFields();
    setBookFilterSchool(null);
    setBookFilterGrade(null);
    setBookFilterLevel(null);
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

  const updateLearning = async (learningId, patch) => {
    try {
      await client.patch(`/learnings/${learningId}`, patch);
      message.success('학습 정보가 업데이트되었습니다.');
      await loadAll();
    } catch (err) {
      message.error(err.response?.data?.message || '업데이트에 실패했습니다.');
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

  const updateStudentDate = async (field, date) => {
    try {
      const updatedValue = date ? date.toISOString() : null;
      await client.put(`/students/${studentId}`, {
        [field]: updatedValue
      });
      message.success('날짜가 업데이트되었습니다.');
      await loadAll();
    } catch (err) {
      message.error('날짜 업데이트에 실패했습니다.');
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

  // --- 모달 교재 필터 옵션 산출 ---
  const filterProps = {
    schools: [...new Set(textbooks.map(b => b.gradeLevel))].filter(Boolean),
    grades: [...new Set(textbooks.map(b => b.grade))].filter(Boolean).sort((a,b)=>a-b),
    levels: [...new Set(textbooks.map(b => b.learningLevel))].filter(Boolean),
  };

  const filteredTextbooks = textbooks.filter(b => {
    if (bookFilterSchool && b.gradeLevel !== bookFilterSchool) return false;
    if (bookFilterGrade && b.grade !== bookFilterGrade) return false;
    if (bookFilterLevel && b.learningLevel !== bookFilterLevel) return false;
    return true;
  });

  const items = learnings
    .filter((L) => {
      if (filterMode === '진행중') return L.status !== '완료';
      return true;
    })
    .map((L) => {
      // 과정 시작일(L.startedAt) 기준으로 오늘까지 경과일 계산
      const courseStartedAt = L.startedAt || null;
      const hasActiveUnit = (L.units || []).some(u => u.status === '학습중');

      let elapsedText = '0일';
      if (courseStartedAt && hasActiveUnit) {
        const start = dayjs(courseStartedAt);
        const today = dayjs();
        const months = today.diff(start, 'month');
        const tempDate = start.add(months, 'month');
        const days = today.diff(tempDate, 'day');

        if (months > 0) {
          elapsedText = `${months}개월 ${days}일`;
        } else {
          elapsedText = `${days}일`;
        }
      }

      // 날짜 범위 표기용 포맷: MM.DD
      const startDateStr = courseStartedAt ? dayjs(courseStartedAt).format('MM.DD') : null;
      const todayStr = dayjs().format('MM.DD');

      // 경과일 태그 문구: 시작일이 있으면 날짜 범위 포함, 없으면 미설정 안내
      const elapsedLabel = courseStartedAt
        ? `+${elapsedText}째 (${startDateStr} ~ ${todayStr})`
        : '시작일 미설정';
      const elapsedColor = (courseStartedAt && hasActiveUnit) ? 'warning' : 'default';

      // 진척률 계산 (전체 단원 수 대비 학습완료 단원 수)
      const totalUnits = (L.units || []).length;
      const completedUnits = (L.units || []).filter(u => u.status === '학습완료').length;
      const progressPercent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

      return {
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
                {L.textbook?.title || '교재'}
                <Tag
                  color={elapsedColor}
                  style={{ marginLeft: 8, fontWeight: 'normal' }}
                >
                  {elapsedLabel}
                </Tag>
                <Tag
                  color="purple"
                  style={{ marginLeft: 8, fontWeight: 'normal' }}
                >
                  진척률 {progressPercent}% ({completedUnits}/{totalUnits}개)
                </Tag>
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
              <DatePicker
                size="small"
                placeholder="시작일"
                style={{ width: 120 }}
                format={DATE_FORMATS}
                value={L.startedAt ? dayjs(L.startedAt) : null}
                onChange={(d) => updateLearning(L._id, { startedAt: d ? d.toISOString() : null })}
              />
              <Select
                size="small"
                style={{ width: 90 }}
                value={L.status || '진행중'}
                options={LEARNING_STATUSES.map(s => ({ label: s, value: s }))}
                onChange={(v) => updateLearning(L._id, { status: v })}
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
                  rowKey={(t) => t.order}
                  columns={[
                    {
                      title: '순서',
                      dataIndex: 'order',
                      width: 45,
                      align: 'center'
                    },
                    {
                      title: '소주제',
                      dataIndex: 'title',
                      render: (text, topic) => (
                        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
                          {text}
                          {topic.hasUnitEvaluation && <Tag color="gold" size="small" style={{ marginLeft: 4, fontSize: '9px', padding: '0 2px' }}>평가</Tag>}
                        </div>
                      )
                    },
                    {
                      title: '상태',
                      dataIndex: 'status',
                      width: 95,
                      render: (s, t, i) => (
                        <Select
                          size="small"
                          style={{ 
                            width: '100%', 
                            fontSize: '12px',
                            color: s === '학습완료' ? '#1677ff' : s === '학습중' ? '#d4b106' : undefined,
                            fontWeight: (s === '학습완료' || s === '학습중') ? 'bold' : undefined
                          }}
                          value={s || '미진행'}
                          options={UNIT_STATUSES.map(v => ({ 
                            value: v, 
                            label: (
                              <span style={{ 
                                color: v === '학습완료' ? '#1677ff' : v === '학습중' ? '#d4b106' : undefined, 
                                fontWeight: (v === '학습완료' || v === '학습중') ? 'bold' : undefined 
                              }}>
                                {v}
                              </span>
                            )
                          }))}
                          onChange={(v) => saveTopic(L._id, unitRecord.chapterOrder, i, { status: v })}
                        />
                      )
                    },
                    {
                      title: '시작일',
                      dataIndex: 'startedAt',
                      width: 110,
                      render: (d, t, i) => (
                        <DatePicker
                          size="small"
                          placeholder="시작"
                          style={{ width: '100%' }}
                          format={DATE_FORMATS}
                          value={d ? dayjs(d) : null}
                          onChange={(v) => saveTopic(L._id, unitRecord.chapterOrder, i, { startedAt: v ? v.toISOString() : null })}
                        />
                      )
                    },
                    {
                      title: '완료일',
                      dataIndex: 'completedAt',
                      width: 110,
                      render: (d, t, i) => (
                        <DatePicker
                          size="small"
                          placeholder="완료"
                          style={{ width: '100%' }}
                          format={DATE_FORMATS}
                          value={d ? dayjs(d) : null}
                          onChange={(v) => saveTopic(L._id, unitRecord.chapterOrder, i, { completedAt: v ? v.toISOString() : null })}
                        />
                      )
                    },
                    {
                      title: '결과/메모',
                      dataIndex: 'result',
                      width: 120,
                      render: (v, t, i) => (
                        <Input
                          size="small"
                          placeholder="결과"
                          defaultValue={v}
                          style={{ fontSize: '12px' }}
                          onBlur={(e) => {
                            if (e.target.value !== (v || '')) {
                              saveTopic(L._id, unitRecord.chapterOrder, i, { result: e.target.value });
                            }
                          }}
                        />
                      )
                    }
                  ]}
                />
              ),
              expandedRowKeys: expandedUnitKeys[L._id] || [],
              onExpandedRowsChange: (keys) => handleUnitExpand(L._id, keys)
            }}
            columns={[
            {
                title: <span style={{ whiteSpace: 'nowrap' }}>순서</span>,
                dataIndex: 'chapterOrder',
                width: 45,
                align: 'center'
              },
              {
                title: <span style={{ whiteSpace: 'nowrap' }}>단원</span>,
                key: 't',
                render: (_, u) => {
                  const ch = (L.textbook?.chapters || []).find((c) => c.order === u.chapterOrder);
                  return (
                    <div style={{ fontSize: '13px', whiteSpace: 'nowrap' }}>
                      <Tag color="default" style={{ marginRight: 4, padding: '0 4px' }}>{ch?.chapter_no || u.chapterOrder}</Tag>
                      <span style={{ fontWeight: 'bold' }}>{ch?.title || '-'}</span>
                    </div>
                  );
                },
              },
              {
                title: <span style={{ whiteSpace: 'nowrap' }}>상태</span>,
                dataIndex: 'status',
                width: 100,
                render: (status, u) => (
                  <Select
                    size="small"
                    style={{ 
                      width: '100%', 
                      fontSize: '12px',
                      color: status === '학습완료' ? '#1677ff' : status === '학습중' ? '#d4b106' : undefined,
                      fontWeight: (status === '학습완료' || status === '학습중') ? 'bold' : undefined
                    }}
                    value={status}
                    options={UNIT_STATUSES.map((s) => ({ 
                      value: s, 
                      label: (
                        <span style={{ 
                          color: s === '학습완료' ? '#1677ff' : s === '학습중' ? '#d4b106' : undefined, 
                          fontWeight: (s === '학습완료' || s === '학습중') ? 'bold' : undefined 
                        }}>
                          {s}
                        </span>
                      )
                    }))}
                    onChange={(v) => saveUnit(L._id, u.chapterOrder, { status: v })}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: 'nowrap' }}>시작일</span>,
                width: 120,
                render: (_, u) => (
                  <DatePicker
                    size="small"
                    placeholder="시작"
                    style={{ width: '100%' }}
                    format={DATE_FORMATS}
                    value={u.startedAt ? dayjs(u.startedAt) : null}
                    onChange={(d) => saveUnit(L._id, u.chapterOrder, { startedAt: d ? d.toISOString() : null })}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: 'nowrap' }}>완료일</span>,
                width: 120,
                render: (_, u) => (
                  <DatePicker
                    size="small"
                    placeholder="완료"
                    style={{ width: '100%' }}
                    format={DATE_FORMATS}
                    value={u.completedAt ? dayjs(u.completedAt) : null}
                    onChange={(d) => saveUnit(L._id, u.chapterOrder, { completedAt: d ? d.toISOString() : null })}
                  />
                ),
              },
              {
                title: <span style={{ whiteSpace: 'nowrap' }}>결과</span>,
                dataIndex: 'unitEvaluationResult',
                width: 120,
                render: (t, u) => (
                  <Input
                    size="small"
                    placeholder="결과"
                    defaultValue={t}
                    style={{ fontSize: '12px' }}
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
    };
  });

  const isCounselingWarning = student.lastCounselingAt
    ? dayjs().diff(dayjs(student.lastCounselingAt), 'day') >= 90
    : false;

  const isStudyRecordWarning = student.lastStudyRecordUpdatedAt
    ? dayjs().diff(dayjs(student.lastStudyRecordUpdatedAt), 'day') >= 90
    : false;

  return (
    <div>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Typography.Title level={4} style={{ margin: 0 }}>
              학습진도 —{' '}
              <span
                style={{
                  cursor: 'pointer',
                  color: '#1677ff',
                  textDecoration: 'underline',
                }}
                onClick={() => navigate(`/students/${studentId}`)}
              >
                {student.name}
              </span>
            </Typography.Title>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <Typography.Text type="secondary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: '4px' }}>
                💬 마지막 상담일: {' '}
                {editCounseling ? (
                  <DatePicker
                    size="small"
                    style={{ width: 130 }}
                    format={DATE_FORMATS}
                    value={student.lastCounselingAt ? dayjs(student.lastCounselingAt) : null}
                    onChange={(d) => {
                      updateStudentDate('lastCounselingAt', d);
                      setEditCounseling(false);
                    }}
                    onOpenChange={(open) => {
                      if (!open) setEditCounseling(false);
                    }}
                    defaultOpen
                  />
                ) : (
                  <span 
                    style={{ 
                      color: isCounselingWarning ? '#ff4d4f' : 'black', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      borderBottom: isCounselingWarning ? '1px dashed #ff4d4f' : '1px dashed black'
                    }} 
                    onClick={() => setEditCounseling(true)}
                    title="클릭하여 변경"
                  >
                    {getElapsedText(student.lastCounselingAt)}
                  </span>
                )}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: '4px' }}>
                📝 학습 기록 최종 업데이트일: {' '}
                {editStudyRecord ? (
                  <DatePicker
                    size="small"
                    style={{ width: 130 }}
                    format={DATE_FORMATS}
                    value={student.lastStudyRecordUpdatedAt ? dayjs(student.lastStudyRecordUpdatedAt) : null}
                    onChange={(d) => {
                      updateStudentDate('lastStudyRecordUpdatedAt', d);
                      setEditStudyRecord(false);
                    }}
                    onOpenChange={(open) => {
                      if (!open) setEditStudyRecord(false);
                    }}
                    defaultOpen
                  />
                ) : (
                  <span 
                    style={{ 
                      color: isStudyRecordWarning ? '#ff4d4f' : 'black', 
                      fontWeight: 'bold', 
                      cursor: 'pointer',
                      borderBottom: isStudyRecordWarning ? '1px dashed #ff4d4f' : '1px dashed black'
                    }} 
                    onClick={() => setEditStudyRecord(true)}
                    title="클릭하여 변경"
                  >
                    {getElapsedText(student.lastStudyRecordUpdatedAt)}
                  </span>
                )}
              </Typography.Text>
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
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
          <Collapse 
            items={items} 
            activeKey={expandedKeys}
            onChange={handleCollapseChange}
          />
        )}
      </Space>

      <Modal title="학습 등록" open={addOpen} onOk={submitAdd} onCancel={() => setAddOpen(false)} destroyOnClose>
        <Form form={addForm} layout="vertical">
          <Form.Item name="learningType" label="학습종류" rules={[{ required: true }]}>
            <Select options={LEARNING_TYPE_ORDER.map((t) => ({ value: t, label: t }))} />
          </Form.Item>

          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
              교재 필터 <span style={{ fontSize: 12, color: '#888', fontWeight: 'normal' }}>(선택사항)</span>
            </Typography.Text>
            <Space size="small" wrap>
              <Select
                placeholder="학교급"
                allowClear
                style={{ width: 100 }}
                value={bookFilterSchool}
                onChange={setBookFilterSchool}
                options={filterProps.schools.map((s) => ({ value: s, label: s }))}
              />
              <Select
                placeholder="학년"
                allowClear
                style={{ width: 100 }}
                value={bookFilterGrade}
                onChange={setBookFilterGrade}
                options={filterProps.grades.map((s) => ({ value: s, label: s }))}
              />
              <Select
                placeholder="학습수준"
                allowClear
                style={{ width: 100 }}
                value={bookFilterLevel}
                onChange={setBookFilterLevel}
                options={filterProps.levels.map((s) => ({ value: s, label: s }))}
              />
            </Space>
          </div>

          <Form.Item name="textbook" label={`교재 선택 (${filteredTextbooks.length}권)`} rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={filteredTextbooks.map((b) => ({
                value: b._id,
                label: `[${b.gradeLevel}] ${b.title} - ${b.grade}학년 (${b.publishYear})`,
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
            <DatePicker style={{ width: '100%' }} format={DATE_FORMATS} />
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
