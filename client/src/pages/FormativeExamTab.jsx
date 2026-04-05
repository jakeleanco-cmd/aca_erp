import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Space, Typography, Tag, Popconfirm, message, DatePicker,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';

/**
 * 형성평가 / 내신준비평가 통합 관리 탭
 * props.category: '형성평가' | '내신준비평가'
 */

// ─── 프론트엔드 상수 (서버 상수와 동일하게 유지) ───
const FORMATIVE_EXAM_TYPES = ['레벨평가', '과정평가', '단원평가', '내신평가', '임의평가'];
const MIDTERM_PREP_EXAM_TYPES = [
  '최다빈출', '서술형',
  '강남3구기출(객관식)', '강남3구기출(서술형)',
  '최다오답', '고난이도', '학교기출',
];
const COURSE_EXAM_LEVELS = ['기본', '실력', '심화'];
const UNIT_EXAM_LEVELS = ['개념', '기초', '기본', '실력', '심화'];
const SCHOOL_EXAM_PERIODS = ['중간고사', '기말고사'];
const SCHOOL_LEVELS = ['초등', '중등', '고등'];

// 학교급별 기본 문항수
const DEFAULT_QUESTION_COUNTS = {
  '레벨평가': { '초등': 25, '중등': 25, '고등': 25 },
  '과정평가': { '초등': 15, '중등': 20, '고등': 25 },
  '단원평가': { '초등': 10, '중등': 15, '고등': 20 },
  '최다빈출': { '초등': 20, '중등': 20, '고등': 20 },
  '서술형': { '초등': 20, '중등': 20, '고등': 20 },
  '강남3구기출(객관식)': { '초등': 25, '중등': 25, '고등': 25 },
  '강남3구기출(서술형)': { '초등': 25, '중등': 25, '고등': 25 },
  '최다오답': { '초등': 15, '중등': 15, '고등': 15 },
  '고난이도': { '초등': 15, '중등': 15, '고등': 15 },
};

/**
 * 평가 종류에 따라 수준(level) 선택 옵션 반환
 */
function getLevelOptions(examType) {
  if (examType === '과정평가') return COURSE_EXAM_LEVELS;
  if (examType === '단원평가') return UNIT_EXAM_LEVELS;
  return [];
}

/**
 * 평가 종류 + 학교급으로 기본 문항수 반환
 */
function getDefaultQuestionCount(examType, schoolLevel) {
  const map = DEFAULT_QUESTION_COUNTS[examType];
  if (!map) return 0;
  return map[schoolLevel] || 0;
}

export default function FormativeExamTab({ category }) {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [form] = Form.useForm();

  // 해당 카테고리의 평가 종류 목록
  const examTypeOptions = category === '형성평가'
    ? FORMATIVE_EXAM_TYPES
    : MIDTERM_PREP_EXAM_TYPES;

  // 현재 폼에서 선택된 평가 종류 / 학교급을 감시
  const watchExamType = Form.useWatch('examType', form);
  const watchSchoolLevel = Form.useWatch('schoolLevel', form);

  // 수준 옵션 동적 변경
  const levelOptions = useMemo(() => getLevelOptions(watchExamType), [watchExamType]);

  // 학생 목록 + 평가 목록 로드
  useEffect(() => {
    loadStudents();
  }, []);

  useEffect(() => {
    loadExams();
  }, [category, filterType]);

  const loadStudents = async () => {
    try {
      const { data } = await client.get('/students');
      setStudents(data.filter(s => s.status === '재원'));
    } catch {
      // 학생 목록 로딩 실패 시 빈 배열 유지
    }
  };

  const loadExams = async () => {
    setLoading(true);
    try {
      const params = { category };
      if (filterType) params.examType = filterType;
      const { data } = await client.get('/formative-exams', { params });
      setRows(data);
    } catch {
      message.error('평가 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 평가 종류 변경 시 문항수 자동 세팅
  useEffect(() => {
    if (watchExamType && watchSchoolLevel) {
      const defaultCount = getDefaultQuestionCount(watchExamType, watchSchoolLevel);
      if (defaultCount > 0) {
        form.setFieldValue('totalQuestions', defaultCount);
      }
    }
  }, [watchExamType, watchSchoolLevel]);

  const openNew = () => {
    form.resetFields();
    form.setFieldsValue({
      examDate: dayjs(),
      examType: examTypeOptions[0],
    });
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    form.setFieldsValue({
      ...record,
      examDate: dayjs(record.examDate),
      student: record.student?._id || record.student,
    });
    setEditingId(record._id);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      const payload = {
        ...vals,
        category,
        examDate: vals.examDate.toISOString(),
      };

      if (editingId) {
        await client.put(`/formative-exams/${editingId}`, payload);
        message.success('수정되었습니다.');
      } else {
        await client.post('/formative-exams', payload);
        message.success('등록되었습니다.');
      }

      setModalOpen(false);
      loadExams();
    } catch (err) {
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/formative-exams/${id}`);
      message.success('삭제되었습니다.');
      loadExams();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  // ─── 테이블 컬럼 정의 ───
  const columns = [
    {
      title: '학생',
      key: 'student',
      width: 70,
      fixed: 'left',
      render: (_, r) => r.student?.name || '-',
    },
    {
      title: '평가종류',
      dataIndex: 'examType',
      width: 110,
      render: (v) => <Tag color="blue" bordered={false}>{v}</Tag>,
    },
    {
      title: '수준',
      dataIndex: 'level',
      width: 60,
      render: (v) => v || '-',
    },
    {
      title: '문항',
      key: 'questions',
      width: 70,
      render: (_, r) => r.totalQuestions > 0
        ? `${r.correctCount}/${r.totalQuestions}`
        : '-',
    },
    {
      title: '점수',
      dataIndex: 'score',
      width: 60,
      render: (v) => (
        <Typography.Text strong style={{ color: v >= 80 ? '#52c41a' : v >= 60 ? '#faad14' : '#ff4d4f' }}>
          {v}점
        </Typography.Text>
      ),
    },
    {
      title: '단원/메모',
      key: 'info',
      ellipsis: true,
      render: (_, r) => r.chapterName || r.memo || '-',
    },
    {
      title: '시험일',
      dataIndex: 'examDate',
      width: 90,
      render: (v) => dayjs(v).format('YY.MM.DD'),
    },
    {
      title: '',
      key: 'actions',
      width: 70,
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* 필터 + 등록 버튼 */}
      <Space style={{ marginBottom: 16 }} wrap size={[8, 12]}>
        <Select
          allowClear
          placeholder="평가 종류 필터"
          style={{ width: 170 }}
          value={filterType}
          onChange={(v) => setFilterType(v || null)}
          options={examTypeOptions.map(t => ({ label: t, value: t }))}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>
          평가 등록
        </Button>
      </Space>

      {/* 평가 목록 테이블 */}
      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 600 }}
        size="small"
        pagination={{ pageSize: 20 }}
      />

      {/* 등록/수정 모달 */}
      <Modal
        title={editingId ? '평가 수정' : '평가 등록'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" size="small">
          {/* 학생 선택 */}
          <Form.Item name="student" label="학생" rules={[{ required: true, message: '학생을 선택하세요' }]}>
            <Select
              showSearch
              placeholder="학생 검색"
              optionFilterProp="label"
              options={students.map(s => ({ label: `${s.name} (${s.schoolLevel} ${s.gradeLabel})`, value: s._id }))}
            />
          </Form.Item>

          <Space style={{ display: 'flex' }} align="start">
            {/* 평가 종류 */}
            <Form.Item name="examType" label="평가 종류" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={examTypeOptions.map(t => ({ label: t, value: t }))} />
            </Form.Item>

            {/* 학교급 */}
            <Form.Item name="schoolLevel" label="학교급">
              <Select style={{ width: 90 }} options={SCHOOL_LEVELS.map(l => ({ label: l, value: l }))} />
            </Form.Item>
          </Space>

          {/* 수준 (과정평가/단원평가 시에만 표시) */}
          {levelOptions.length > 0 && (
            <Form.Item name="level" label="수준">
              <Select options={levelOptions.map(l => ({ label: l, value: l }))} />
            </Form.Item>
          )}

          {/* 내신평가 전용 필드 */}
          {watchExamType === '내신평가' && (
            <Space style={{ display: 'flex' }}>
              <Form.Item name="semester" label="학기">
                <Select style={{ width: 100 }} options={['1학기', '2학기'].map(s => ({ label: s, value: s }))} />
              </Form.Item>
              <Form.Item name="examPeriod" label="시험구분">
                <Select style={{ width: 120 }} options={SCHOOL_EXAM_PERIODS.map(p => ({ label: p, value: p }))} />
              </Form.Item>
            </Space>
          )}

          {/* 학교기출 전용 필드 */}
          {watchExamType === '학교기출' && (
            <Form.Item name="schoolName" label="학교명">
              <Input placeholder="학교 이름" />
            </Form.Item>
          )}

          {/* 단원명 */}
          <Form.Item name="chapterName" label="단원명">
            <Input placeholder="예: 1단원 - 일차방정식" />
          </Form.Item>

          {/* 문항수 + 맞은 개수 */}
          <Space style={{ display: 'flex' }}>
            <Form.Item name="totalQuestions" label="총 문항수">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="correctCount" label="맞은 개수">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          {/* 시험일 */}
          <Form.Item name="examDate" label="시험일" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          {/* 메모 */}
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} placeholder="특이사항" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
