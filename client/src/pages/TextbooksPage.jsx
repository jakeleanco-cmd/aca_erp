import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, message } from 'antd';
import client from '../api/client';

export default function TextbooksPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/textbooks');
        setRows(data);
      } catch {
        message.error('교재 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = [
    { title: '교재명', dataIndex: 'title', key: 'title' },
    { title: '출판년도', dataIndex: 'publishYear', key: 'publishYear' },
    { title: '학년구분', dataIndex: 'schoolLevel', key: 'schoolLevel' },
    { title: '학년', dataIndex: 'gradeLabel', key: 'gradeLabel' },
    { title: '학습수준', dataIndex: 'learningLevel', key: 'learningLevel' },
    {
      title: '단원 수',
      key: 'ch',
      render: (_, r) => (r.chapters || []).length,
    },
    {
      title: '작업',
      key: 'a',
      render: (_, r) => (
        <Button type="link" onClick={() => navigate(`/textbooks/${r._id}`)}>
          수정
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>교재 관리</h2>
        <Button type="primary" onClick={() => navigate('/textbooks/new')}>
          교재 등록
        </Button>
      </div>
      <Table rowKey="_id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />
    </div>
  );
}
