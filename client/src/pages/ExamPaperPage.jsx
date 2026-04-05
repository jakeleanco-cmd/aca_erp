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
  const [form] = Form.useForm();

  const watchCategory = Form.useWatch('category', form);
  const examTypeOptions = watchCategory === '형성평가'
    ? FORMATIVE_EXAM_TYPES
    : MIDTERM_PREP_EXAM_TYPES;

  useEffect(() => {
    loadPapers();
  }, []);

  const loadPapers = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/exam-papers');
      setPapers(data);
    } catch {
      message.error('시험지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    form.resetFields();
    form.setFieldsValue({ category: '형성평가', schoolLevel: '중등' });
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
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      if (editingId) {
        const existingFiles = fileList
          .filter(f => !f.originFileObj && f.url)
          .map(f => f.name); // Using name as filename pointer
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

  const columns = [
    {
      title: '시험지명',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: '분류',
      key: 'type',
      render: (_, r) => (
        <Space>
          <Tag color="purple">{r.category}</Tag>
          <Tag color="blue">{r.examType}</Tag>
        </Space>
      )
    },
    {
      title: '대상',
      key: 'target',
      render: (_, r) => `${r.schoolLevel} ${r.gradeLabel || ''}`,
    },
    {
      title: '문항수',
      dataIndex: 'totalQuestions',
      width: 80,
    },
    {
      title: '파일',
      key: 'files',
      render: (_, r) => (
        <Space>
          {(r.attachments || []).map(att => (
            <a key={att.filename} href={`/api${att.path}`} target="_blank" rel="noopener noreferrer">
              {checkFileIsImage(att.filename) ? <PictureOutlined /> : <FilePdfOutlined style={{ color: '#ff4d4f' }} />}
            </a>
          ))}
        </Space>
      )
    },
    {
      title: '관리',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDelete(r._id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={5} style={{ margin: 0 }}>시험지 보관함</Typography.Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>시험지 등록</Button>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={papers}
        size="small"
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
            <Col xs={12} sm={12}>
              <Form.Item name="schoolLevel" label="학교급">
                <Select options={SCHOOL_LEVELS.map(l => ({ label: l, value: l }))} />
              </Form.Item>
            </Col>
            <Col xs={12} sm={12}>
              <Form.Item name="gradeLabel" label="학년">
                <Input placeholder="예: 중2" />
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
