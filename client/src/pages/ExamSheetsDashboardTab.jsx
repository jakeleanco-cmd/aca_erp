import React, { useEffect, useState } from 'react';
import { Card, Table, Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';

export default function ExamSheetsDashboardTab() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/students');
        setStudents(data.filter(s => s.status === '재원'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const columns = [
    {
      title: '학생명',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <a onClick={() => navigate(`/students/${record._id}?tab=exam`)}>{text}</a>,
    },
    {
      title: '학급/학년',
      dataIndex: 'gradeLabel',
      key: 'gradeLabel',
      render: (text, record) => <Tag color="blue">{record.schoolLevel} {text}</Tag>
    },
    {
      title: '관리',
      key: 'action',
      render: (_, record) => (
        <Button size="small" onClick={() => navigate(`/students/${record._id}?tab=exam`)}>
          내신 성적 관리
        </Button>
      ),
    }
  ];

  return (
    <Card bodyStyle={{ padding: 0 }} style={{ border: 'none' }}>
      <Table 
        columns={columns} 
        dataSource={students} 
        rowKey="_id" 
        loading={loading}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );
}
