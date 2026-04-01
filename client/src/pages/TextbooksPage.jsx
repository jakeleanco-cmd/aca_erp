import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, message, Input, Popconfirm, Space, Typography } from 'antd';
import { DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import client from '../api/client';

export default function TextbooksPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [searchText, setSearchText] = useState('');

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

  const filteredRows = rows.filter((r) => {
    const search = searchText.toLowerCase();
    return (
      r.title?.toLowerCase().includes(search) ||
      r.schoolLevel?.toLowerCase().includes(search) ||
      r.gradeLabel?.toLowerCase().includes(search)
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
      dataIndex: 'schoolLevel',
      key: 'schoolLevel',
      align: 'center',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>
    },
    {
      title: '학년',
      dataIndex: 'gradeLabel',
      key: 'gradeLabel',
      align: 'center',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>
    },
    {
      title: '학습수준',
      dataIndex: 'learningLevel',
      key: 'learningLevel',
      align: 'center',
      render: (v) => <span style={{ whiteSpace: 'nowrap' }}>{v}</span>
    },
    {
      title: '구성', // '단원 수' 대신 '구성'으로 변경
      key: 'structure',
      align: 'center',
      render: (_, r) => {
        const chapterCount = (r.chapters || []).length;
        // 모든 단원의 topics 길이를 합산
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
      width: 100, // 버튼 영역은 최소한의 고정 너비 유지
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
    </div>
  );
}
