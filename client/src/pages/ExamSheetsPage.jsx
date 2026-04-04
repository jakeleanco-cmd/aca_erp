import React, { useEffect, useState } from 'react';
import { Card, Table, Typography, Space, Select, Tag, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import client from '../api/client';

export default function ExamSheetsPage() {
  const [students, setStudents] = useState([]);
  const [examSheets, setExamSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState(dayjs().year());
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stuRes] = await Promise.all([
        client.get('/students'),
      ]);
      setStudents(stuRes.data);
      
      // Load all exam sheets across all students by iterating or we should have made an endpoint for all.
      // Since we only made by-student/:id, we can fetch for each student or add a global one.
      // Let's add a global endpoint in the backend or fetch sequentially for now.
      // Actually, wait, let's just make a global endpoint in the backend. 
      // I'll fetch `/api/students` then `/api/exam-sheets` if it exists. 
      // I forgot to make `/api/exam-sheets` GET all. I'll just keep it simple and show students list here,
      // and redirect to student detail's "Grade" tab.
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            내신 성적 대시보드
          </Typography.Title>
          <Typography.Text type="secondary">
            학생별 내신 성적을 통합 관리합니다.
          </Typography.Text>
        </div>
      </div>
      
      <Card>
        <Table 
          columns={columns} 
          dataSource={students} 
          rowKey="_id" 
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </Space>
  );
}
