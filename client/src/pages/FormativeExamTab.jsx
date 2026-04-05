import { useEffect, useState, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Space, Typography, Tag, Popconfirm, message, DatePicker, Upload,
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, EditOutlined, 
  UploadOutlined, FilePdfOutlined, PictureOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';

/**
 * 형성평가 / 내신준비평가 통합 관리 탭
 * props.category: '형성평가' | '내신준비평가'
 * props.studentId: 특정 학생 필터링 시 사용 (학생 상세 페이지용)
 */

// ─── 프론트엔드 상수 ───
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

function getLevelOptions(examType) {
  if (examType === '과정평가') return COURSE_EXAM_LEVELS;
  if (examType === '단원평가') return UNIT_EXAM_LEVELS;
  return [];
}

function getDefaultQuestionCount(examType, schoolLevel) {
  const map = DEFAULT_QUESTION_COUNTS[examType];
  if (!map) return 0;
  return map[schoolLevel] || 0;
}

const checkFileIsImage = (filename) => {
  return filename && filename.match(/\.(jpeg|jpg|gif|png)$/i) != null;
};

export default function FormativeExamTab({ category, studentId = null }) {
  const [rows, setRows] = useState([]);
  const [students, setStudents] = useState([]);
  const [examPapers, setExamPapers] = useState([]); // 신규: 시험지 목록
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();

  const examTypeOptions = category === '형성평가'
    ? FORMATIVE_EXAM_TYPES
    : MIDTERM_PREP_EXAM_TYPES;

  const watchExamType = Form.useWatch('examType', form);
  const watchSchoolLevel = Form.useWatch('schoolLevel', form);
  const watchExamPaper = Form.useWatch('examPaper', form); // 신규: 선택된 시험지 감시
  const levelOptions = useMemo(() => getLevelOptions(watchExamType), [watchExamType]);

  useEffect(() => {
    if (!studentId) loadStudents();
    loadExamPapers(); // 신규: 시험지 로드
  }, [studentId, category]);

  useEffect(() => {
    loadExams();
  }, [category, filterType, studentId]);

  const loadStudents = async () => {
    try {
      const { data } = await client.get('/students');
      setStudents(data.filter(s => s.status === '재원'));
    } catch {}
  };

  const loadExamPapers = async () => {
    try {
      const { data } = await client.get('/exam-papers', { params: { category } });
      setExamPapers(data);
    } catch {}
  };

  const loadExams = async () => {
    setLoading(true);
    try {
      const params = { category };
      if (filterType) params.examType = filterType;
      if (studentId) params.studentId = studentId;
      const { data } = await client.get('/formative-exams', { params });
      setRows(data);
    } catch {
      message.error('평가 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 신규: 시험지 선택 시 자동 완성
  useEffect(() => {
    if (watchExamPaper) {
      const paper = examPapers.find(p => p._id === watchExamPaper);
      if (paper) {
        form.setFieldsValue({
          title: paper.title,
          examType: paper.examType,
          schoolLevel: paper.schoolLevel,
          gradeLabel: paper.gradeLabel,
          level: paper.level,
          totalQuestions: paper.totalQuestions,
        });
      }
    }
  }, [watchExamPaper, examPapers, form]);

  useEffect(() => {
    // 시험지 선택 중이 아닐 때만 학교급 변경 시 기본 문항수 세팅
    if (!watchExamPaper && watchExamType && watchSchoolLevel) {
      const defaultCount = getDefaultQuestionCount(watchExamType, watchSchoolLevel);
      if (defaultCount > 0) {
        form.setFieldValue('totalQuestions', defaultCount);
      }
    }
  }, [watchExamType, watchSchoolLevel, watchExamPaper]);

  const openNew = () => {
    form.resetFields();
    form.setFieldsValue({
      examDate: dayjs(),
      examType: examTypeOptions[0],
      student: studentId,
    });
    setFileList([]);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    form.setFieldsValue({
      ...record,
      examDate: dayjs(record.examDate),
      student: record.student?._id || record.student,
      examPaper: record.examPaper?._id || record.examPaper,
    });
    setEditingId(record._id);

    const initialFiles = (record.attachments || []).map((att, i) => ({
      uid: -i,
      name: att.filename,
      status: 'done',
      url: `/api${att.path}`
    }));
    setFileList(initialFiles);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const vals = await form.validateFields();
      const formData = new FormData();
      
      formData.append('category', category);
      formData.append('examType', vals.examType);
      formData.append('title', vals.title || '');
      formData.append('student', vals.student);
      formData.append('examPaper', vals.examPaper || ''); // 신규: 시험공 참조
      formData.append('schoolLevel', vals.schoolLevel || '');
      formData.append('gradeLabel', vals.gradeLabel || '');
      formData.append('level', vals.level || '');
      formData.append('totalQuestions', vals.totalQuestions || 0);
      formData.append('correctCount', vals.correctCount || 0);
      formData.append('examDate', vals.examDate.toISOString());
      formData.append('semester', vals.semester || '');
      formData.append('examPeriod', vals.examPeriod || '');
      formData.append('schoolName', vals.schoolName || '');
      formData.append('chapterName', vals.chapterName || '');
      formData.append('memo', vals.memo || '');

      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      if (editingId) {
        const existingFiles = fileList
          .filter(f => !f.originFileObj && f.url)
          .map(f => f.name);
        formData.append('existingFiles', JSON.stringify(existingFiles));
        
        await client.put(`/formative-exams/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('수정되었습니다.');
      } else {
        await client.post('/formative-exams', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
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

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false;
    },
    fileList,
    listType: "picture",
  };

  const columns = [
    {
      title: '학생',
      key: 'student',
      width: 70,
      fixed: 'left',
      hidden: !!studentId,
      render: (_, r) => r.student?.name || '-',
    },
    {
      title: '평가유형 (시험지)',
      key: 'exam_info',
      width: 150,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Tag color="blue">{r.examType}</Tag>
          <Typography.Text style={{ fontSize: 13 }}>{r.title}</Typography.Text>
        </Space>
      ),
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
      title: '원본/결과',
      key: 'files',
      width: 80,
      render: (_, r) => (
        <Space size="small">
          {/* 원본 시험지 링크 (필드 연동 시) */}
          {r.examPaper?.attachments?.map(att => (
            <a key={att.filename} href={`/api${att.path}`} target="_blank" rel="noopener noreferrer" title="원본 시험지">
              <FilePdfOutlined style={{ color: '#2b3a8f' }} />
            </a>
          ))}
          {/* 학생 결과물 */}
          {(r.attachments || []).map(att => (
            <a key={att.filename} href={`/api${att.path}`} target="_blank" rel="noopener noreferrer" title="학생 결과">
              {checkFileIsImage(att.filename) ? <PictureOutlined /> : <FilePdfOutlined style={{ color: '#ff4d4f' }} />}
            </a>
          ))}
        </Space>
      )
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
  ].filter(col => !col.hidden);

  return (
    <div>
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

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 600 }}
        size="small"
        pagination={{ pageSize: 20 }}
      />

      <Modal
        title={editingId ? '평가 수정' : '평가 결과 기록'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={480}
      >
        <Form form={form} layout="vertical" size="small">
          <Space style={{ width: '100%' }} direction="vertical" size={12}>
            {!studentId && (
              <Form.Item name="student" label="학생" rules={[{ required: true, message: '학생을 선택하세요' }]} style={{ marginBottom: 0 }}>
                <Select
                  showSearch
                  placeholder="학생 검색"
                  optionFilterProp="label"
                  options={students.map(s => ({ label: `${s.name} (${s.schoolLevel} ${s.gradeLabel})`, value: s._id }))}
                />
              </Form.Item>
            )}

            <Form.Item name="examPaper" label="시험지 보관함에서 선택" extra="미리 등록된 시험지를 열어서 점수만 입력할 수 있습니다." style={{ marginBottom: 0 }}>
              <Select
                placeholder="시험지를 선택하면 아래 정보가 자동 채워집니다."
                allowClear
                options={examPapers.map(p => ({ label: `${p.title} (${p.examType})`, value: p._id }))}
              />
            </Form.Item>
          </Space>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: '16px 0' }} />

          <Form.Item name="title" label="시험 제목" rules={[{ required: true }]} style={{ marginBottom: 12 }}>
            <Input placeholder="기록할 시험의 제목" />
          </Form.Item>

          <Space style={{ display: 'flex' }} align="start">
            <Form.Item name="examType" label="평가 종류" rules={[{ required: true }]}>
              <Select style={{ width: 160 }} options={examTypeOptions.map(t => ({ label: t, value: t }))} />
            </Form.Item>

            <Form.Item name="schoolLevel" label="학교급">
              <Select style={{ width: 90 }} options={SCHOOL_LEVELS.map(l => ({ label: l, value: l }))} />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }}>
            {levelOptions.length > 0 && (
              <Form.Item name="level" label="수준" style={{ width: 120 }}>
                <Select options={levelOptions.map(l => ({ label: l, value: l }))} allowClear />
              </Form.Item>
            )}
            <Form.Item name="gradeLabel" label="학년" style={{ flex: 1 }}>
              <Input placeholder="예: 중1" />
            </Form.Item>
          </Space>

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

          <Form.Item name="chapterName" label="단원명">
            <Input placeholder="예: 1단원 - 일차방정식" />
          </Form.Item>

          <Space style={{ display: 'flex' }}>
            <Form.Item name="totalQuestions" label="총 문항수">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="correctCount" label="맞은 개수">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Space>

          <Form.Item name="examDate" label="시험일" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="memo" label="기타 메모(오답 이유 등)">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label="학생 풀이지/결과지 첨부 (개인용)">
            <Upload {...uploadProps} multiple>
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
