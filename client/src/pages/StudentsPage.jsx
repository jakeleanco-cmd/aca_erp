import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Tag, message } from 'antd';
import client from '../api/client';
import dayjs from 'dayjs';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/students');
        setRows(data);
      } catch {
        message.error('학생 목록을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = [
    { title: '이름', dataIndex: 'name', key: 'name' },
    { title: '학년구분', dataIndex: 'schoolLevel', key: 'schoolLevel' },
    { title: '학년', dataIndex: 'gradeLabel', key: 'gradeLabel' },
    {
      title: '월수강료',
      dataIndex: 'monthlyTuition',
      key: 'monthlyTuition',
      render: (v) => `${Number(v).toLocaleString()}원`,
    },
    {
      title: '상태',
      key: 'status',
      render: (_, r) => (r.leftAt ? <Tag color="default">퇴원</Tag> : <Tag color="green">재원</Tag>),
    },
    {
      title: '최초등록일',
      dataIndex: 'enrolledAt',
      key: 'enrolledAt',
      render: (d) => (d ? dayjs(d).format('YYYY-MM-DD') : '-'),
    },
    {
      title: '작업',
      key: 'actions',
      render: (_, r) => (
        <Button type="link" onClick={() => navigate(`/students/${r._id}`)}>
          수정
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>학생 관리</h2>
        <Button type="primary" onClick={() => navigate('/students/new')}>
          학생 등록
        </Button>
      </div>
      <Table rowKey="_id" loading={loading} columns={columns} dataSource={rows} pagination={{ pageSize: 20 }} />
    </div>
  );
}
