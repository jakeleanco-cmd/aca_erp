import { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Space, Typography, Tag, Popconfirm, message, Upload, Row, Col
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, EditOutlined, 
  UploadOutlined, FilePdfOutlined, PictureOutlined 
} from '@ant-design/icons';
import client from '../api/client';

/**
 * 시험지 보관함 (Master Exam Papers)
 */

const FORMATIVE_EXAM_TYPES = ['레벨평가', '과정평가', '단원평가', '내신평가', '임의평가'];
const MIDTERM_PREP_EXAM_TYPES = [
  '최다빈출', '서술형',
  '강남3구기출(객관식)', '강남3구기출(서술형)',
  '최다오답', '고난이도', '학교기출',
];
const SCHOOL_LEVELS = ['초등', '중등', '고등'];
const GRADE_OPTIONS = {
  '초등': ['초4', '초5', '초6'],
  '중등': ['중1', '중2', '중3'],
  '고등': ['고1', '고2', '고3'],
};
const FORMATIVE_CATEGORIES = ['형성평가', '내신준비평가'];

const checkFileIsImage = (filename) => {
  return filename && filename.match(/\.(jpeg|jpg|gif|png)$/i) != null;
};

export default function ExamPaperPage() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [filters, setFilters] = useState({ 
    category: '', 
    schoolLevel: '',
    gradeLabel: '',
    semester: '', 
    examTerm: '', 
    title: '' 
  });
  const [form] = Form.useForm();

  const watchCategory = Form.useWatch('category', form);
  const watchSchoolLevel = Form.useWatch('schoolLevel', form);
  
  const examTypeOptions = watchCategory === '형성평가'
    ? FORMATIVE_EXAM_TYPES
    : MIDTERM_PREP_EXAM_TYPES;

  const currentGradeOptions = GRADE_OPTIONS[watchSchoolLevel] || [];

  useEffect(() => {
    loadPapers();
  }, [filters]);

  const loadPapers = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/exam-papers', { params: filters });
      setPapers(data);
    } catch {
      message.error('시험지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    form.resetFields();
    form.setFieldsValue({ category: '형성평가', schoolLevel: '중등', semester: '' });
    setFileList([]);
    setEditingId(null);
    setModalOpen(true);
  };

  const openEdit = (record) => {
    form.setFieldsValue(record);
    setEditingId(record._id);
    const initialFiles = (record.attachments || []).map((att, i) => ({
      uid: -i,
      name: att.originalName || att.filename,
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
      Object.keys(vals).forEach(key => {
        if (vals[key] !== undefined) formData.append(key, vals[key]);
      });

      fileList.forEach((file) => {
        const fileToUpload = file.originFileObj || file;
        if (fileToUpload instanceof File) {
          formData.append('files', fileToUpload);
        }
      });

      if (editingId) {
        const existingFiles = fileList
          .filter(f => !f.originFileObj && f.url)
          .map(f => f.name);
        formData.append('existingFiles', JSON.stringify(existingFiles));
        
        await client.put(`/exam-papers/${editingId}`, formData);
        message.success('수정되었습니다.');
      } else {
        await client.post('/exam-papers', formData);
        message.success('등록되었습니다.');
      }

      setModalOpen(false);
      loadPapers();
    } catch (err) {
      message.error('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await client.delete(`/exam-papers/${id}`);
      message.success('삭제되었습니다.');
      loadPapers();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  const handleBatchDelete = async () => {
    try {
      await client.post('/exam-papers/batch-delete', { ids: selectedRowKeys });
      message.success(`${selectedRowKeys.length}개의 시험지가 삭제되었습니다.`);
      setSelectedRowKeys([]);
      loadPapers();
    } catch {
      message.error('선택 삭제에 실패했습니다.');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await client.delete('/exam-papers');
      message.success('모든 시험지가 삭제되었습니다.');
      loadPapers();
    } catch {
      message.error('전체 삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '대분류',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: (v) => <Tag color="purple" style={{ margin: 0 }}>{v}</Tag>,
    },
    {
      title: '소분류',
      dataIndex: 'examType',
      key: 'examType',
      width: 120,
      render: (v) => <Tag color="blue" style={{ margin: 0 }}>{v}</Tag>,
    },
    {
      title: '학교급',
      dataIndex: 'schoolLevel',
      key: 'schoolLevel',
      width: 70,
      align: 'center',
    },
    {
      title: '학년',
      dataIndex: 'gradeLabel',
      key: 'gradeLabel',
      width: 70,
      align: 'center',
    },
    {
      title: '학기',
      dataIndex: 'semester',
      key: 'semester',
      width: 70,
      align: 'center',
      render: (v) => v || '-',
    },
    {
      title: '고사',
      dataIndex: 'examTerm',
      key: 'examTerm',
      width: 70,
      align: 'center',
      render: (v) => v || '-',
    },
    {
      title: '시험지명',
      dataIndex: 'title',
      key: 'title',
      minWidth: 220,
      render: (text) => (
        <Typography.Text strong style={{ display: 'block', minWidth: 200, whiteSpace: 'normal', wordBreak: 'keep-all' }}>
          {text}
        </Typography.Text>
      ),
    },
    {
      title: '문항',
      dataIndex: 'totalQuestions',
      width: 60,
      align: 'center',
    },
    {
      title: '파일',
      key: 'files',
      width: 60,
      align: 'center',
      render: (_, r) => (
        <Space>
          {(r.attachments || []).map(att => {
            const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
            return (
              <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer">
                {checkFileIsImage(att.filename) ? <PictureOutlined /> : <FilePdfOutlined style={{ color: '#ff4d4f' }} />}
              </a>
            );
          })}
        </Space>
      )
    },
    {
      title: '관리',
      key: 'actions',
      width: 80,
      fixed: 'right',
      align: 'center',
      render: (_, r) => (
        <Space size={4}>
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Space wrap>
          <Typography.Title level={5} style={{ margin: 0 }}>시험지 보관함</Typography.Title>
          {selectedRowKeys.length > 0 && (
            <Popconfirm 
              title={`${selectedRowKeys.length}개의 시험지를 삭제하시겠습니까?`}
              onConfirm={handleBatchDelete}
            >
              <Button size="small" danger icon={<DeleteOutlined />}>선택 삭제</Button>
            </Popconfirm>
          )}
          <Popconfirm 
            title="모든 시험지를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
            onConfirm={handleDeleteAll}
          >
            <Button size="small" danger type="dashed">전체 삭제</Button>
          </Popconfirm>
        </Space>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNew}>등록</Button>
      </div>

      <div style={{ backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '8px', marginBottom: 16 }}>
        <Space wrap size="middle">
          <Select 
            placeholder="학교급"
            allowClear
            style={{ width: 100 }}
            options={[
              { label: '전체', value: '' },
              ...SCHOOL_LEVELS.map(l => ({ label: l, value: l }))
            ]}
            value={filters.schoolLevel}
            onChange={(v) => setFilters(f => ({ ...f, schoolLevel: v, gradeLabel: '' }))}
          />
          <Select 
            placeholder="학년"
            allowClear
            style={{ width: 100 }}
            options={[
              { label: '전체', value: '' },
              ...(GRADE_OPTIONS[filters.schoolLevel] || Object.values(GRADE_OPTIONS).flat()).map(g => ({ label: g, value: g }))
            ]}
            value={filters.gradeLabel}
            onChange={(v) => setFilters(f => ({ ...f, gradeLabel: v }))}
          />
          <Select 
            placeholder="학기"
            allowClear
            style={{ width: 100 }}
            options={[
              { label: '전체 학기', value: '' },
              { label: '1학기', value: '1학기' },
              { label: '2학기', value: '2학기' },
            ]}
            value={filters.semester}
            onChange={(v) => setFilters(f => ({ ...f, semester: v }))}
          />
          <Select 
            placeholder="고사"
            allowClear
            style={{ width: 100 }}
            options={[
              { label: '전체 고사', value: '' },
              { label: '중간', value: '중간' },
              { label: '기말', value: '기말' },
            ]}
            value={filters.examTerm}
            onChange={(v) => setFilters(f => ({ ...f, examTerm: v }))}
          />
          <Select 
            placeholder="대분류"
            allowClear
            style={{ width: 140 }}
            options={[
              { label: '전체 대분류', value: '' },
              ...FORMATIVE_CATEGORIES.map(c => ({ label: c, value: c }))
            ]}
            value={filters.category}
            onChange={(v) => setFilters(f => ({ ...f, category: v }))}
          />
          <Input.Search 
            placeholder="시험지 제목 검색"
            allowClear
            style={{ width: 220 }}
            onSearch={(v) => setFilters(f => ({ ...f, title: v }))}
          />
          <Button 
            size="small" 
            type="text" 
            onClick={() => setFilters({ 
              category: '', 
              schoolLevel: '',
              gradeLabel: '',
              semester: '', 
              examTerm: '', 
              title: '' 
            })}
          >
            초기화
          </Button>
        </Space>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={papers}
        size="small"
        scroll={{ x: 1000 }}
        tableLayout="fixed"
        pagination={{ pageSize: 15 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <Modal
        title={editingId ? '시험지 수정' : '시험지 등록'}
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="title" label="시험지 제목" rules={[{ required: true }]}>
            <Input placeholder="예: 2024년 1학기 중3 레벨테스트" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="category" label="대분류" rules={[{ required: true }]}>
                <Select options={FORMATIVE_CATEGORIES.map(c => ({ label: c, value: c }))} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="examType" label="소분류" rules={[{ required: true }]}>
                <Select 
                  popupMatchSelectWidth={false}
                  options={examTypeOptions.map(t => ({ label: t, value: t }))} 
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={12} sm={6}>
              <Form.Item name="schoolLevel" label="학교급">
                <Select options={SCHOOL_LEVELS.map(l => ({ label: l, value: l }))} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="gradeLabel" label="학년">
                <Select options={currentGradeOptions.map(g => ({ label: g, value: g }))} placeholder="학년 선택" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="semester" label="학기">
                <Select options={[
                  { label: '1학기', value: '1학기' },
                  { label: '2학기', value: '2학기' },
                  { label: '기타', value: '기타' },
                ]} placeholder="선택" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={6}>
              <Form.Item name="examTerm" label="고사">
                <Select options={[
                  { label: '중간', value: '중간' },
                  { label: '기말', value: '기말' },
                  { label: '기타', value: '기타' },
                ]} placeholder="선택" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={12} sm={12}>
              <Form.Item name="level" label="수준">
                <Input placeholder="예: 심화" />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12}>
              <Form.Item name="totalQuestions" label="기본 문항수">
                <InputNumber style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label="시험지 파일">
            <Upload 
              fileList={fileList}
              onRemove={(file) => setFileList(fileList.filter(f => f.uid !== file.uid))}
              beforeUpload={(file) => { setFileList([...fileList, file]); return false; }}
              multiple
              listType="picture"
            >
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
