import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, message, Input, Popconfirm, Space, Typography, Modal } from 'antd';
import { DeleteOutlined, SearchOutlined, CodeOutlined } from '@ant-design/icons';
import client from '../api/client';

export default function TextbooksPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');

  // JSON 일괄 등록 상태
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [jsonLoading, setJsonLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/textbooks');
      setRows(data);
    } catch {
      message.error('교재 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const deleteBook = async (id) => {
    try {
      await client.delete(`/textbooks/${id}`);
      message.success('교재가 삭제되었습니다.');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  const handleJsonSubmit = async () => {
    if (!jsonInput.trim()) {
      message.error('JSON 데이터를 입력해주세요.');
      return;
    }
    
    let parsedData;
    try {
      parsedData = JSON.parse(jsonInput);
    } catch (err) {
      message.error('유효하지 않은 JSON 형식입니다. 구문을 확인해주세요.');
      return;
    }

    if (!Array.isArray(parsedData)) {
      message.error('데이터는 JSON 배열([]) 형태여야 합니다.');
      return;
    }

    setJsonLoading(true);
    try {
      const { data } = await client.post('/textbooks/batch-json', { jsonData: parsedData });
      Modal.success({
        title: 'JSON 일괄 등록 완료',
        content: `성공적으로 처리되었습니다.\n\n새로 추가됨: ${data.addedCount}건\n중복 생략됨(Skip): ${data.skippedCount}건`,
        onOk: () => {
           setJsonModalOpen(false);
           setJsonInput('');
           loadData();
        }
      });
    } catch (err) {
      message.error(err.response?.data?.message || '일괄 등록에 실패했습니다.');
    } finally {
      setJsonLoading(false);
    }
  };

  const filteredRows = rows.filter((r) => {
    const search = searchText.toLowerCase();
    return (
      r.title?.toLowerCase().includes(search) ||
      r.gradeLevel?.toLowerCase().includes(search) ||
      r.grade?.toString().includes(search)
    );
  });

  const columns = [
    {
      title: '교재명',
      dataIndex: 'title',
      key: 'title',
      render: (t) => <Typography.Text strong style={{ fontSize: 14 }}>{t}</Typography.Text>
    },
    {
      title: '출판년도',
      dataIndex: 'publishYear',
      key: 'publishYear',
      align: 'center',
      render: (y) => <span style={{ color: '#666', whiteSpace: 'nowrap' }}>{y}년</span>
    },
    {
      title: '학년구분',
      dataIndex: 'gradeLevel',
      key: 'gradeLevel',
      align: 'center',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>
    },
    {
      title: '학년',
      dataIndex: 'grade',
      key: 'grade',
      align: 'center',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v ? `${v}학년` : '-'}</span>
    },
    {
      title: '학습수준',
      dataIndex: 'learningLevel',
      key: 'learningLevel',
      align: 'center',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>
    },
    {
      title: '구성',
      key: 'structure',
      align: 'center',
      render: (_, r) => {
        const chapterCount = (r.chapters || []).length;
        const topicCount = (r.chapters || []).reduce((acc, ch) => acc + (ch.topics || []).length, 0);
        return (
          <Space direction="vertical" size={0} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
            <span>단원: {chapterCount}개</span>
            <span style={{ color: '#8c8c8c' }}>주제: {topicCount}개</span>
          </Space>
        );
      },
    },
    {
      title: '작업',
      key: 'a',
      align: 'center',
      width: 100,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" onClick={() => navigate(`/textbooks/${r._id}`)} style={{ padding: 0 }}>
            수정
          </Button>
          <Popconfirm
            title="교재 삭제"
            description="이 교재를 삭제하시겠습니까? 연결된 학습 데이터에 영향을 줄 수 있습니다."
            onConfirm={() => deleteBook(r._id)}
            okText="삭제"
            cancelText="취소"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>교재 관리</h2>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            등록된 시스템 교재 리스트를 검색하고 관리할 수 있습니다. (총 {filteredRows.length}종)
          </Typography.Text>
        </div>
        <Space wrap>
          <Input
            placeholder="교재명, 학년 검색"
            prefix={<SearchOutlined style={{ color: '#888' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />
          <Button icon={<CodeOutlined />} onClick={() => setJsonModalOpen(true)}>
            JSON등록
          </Button>
          <Button type="primary" onClick={() => navigate('/textbooks/new')}>
            교재 등록
          </Button>
        </Space>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        columns={columns}
        dataSource={filteredRows}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        scroll={{ x: 'max-content' }}
        size="middle"
      />

      {/* JSON 일괄 등록 모달 */}
      <Modal
        title="JSON 형태 교재 일괄 등록"
        open={jsonModalOpen}
        onCancel={() => {
          setJsonModalOpen(false);
          setJsonInput('');
        }}
        onOk={handleJsonSubmit}
        confirmLoading={jsonLoading}
        okText="일괄 등록 실행"
        cancelText="취소"
        width={700}
        destroyOnClose
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          배열(`[]`)로 감싸진 교재 데이터 JSON 객체를 붙여넣어 주세요.<br/>
          동일한 제목(title), 출판년도(year), 학교급, 학년 기호(gradeLabel)를 가진 교재는 중복으로 간주되어 자동으로 <strong style={{ color: '#ff4d4f' }}>Skip</strong> 처리됩니다.
        </Typography.Paragraph>
        <Input.TextArea
          rows={16}
          placeholder={`[\n  {\n    "series": "쎈",\n    "subject": "수학",\n    "grade_level": "중등",\n    ...\n  }\n]`}
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          style={{ fontFamily: 'monospace' }}
        />
      </Modal>
    </div>
  );
}
