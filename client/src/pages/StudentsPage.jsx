import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Button, Tag, message, Avatar, Typography, Card, Input, Space } from 'antd';
import { UserOutlined, PlusOutlined, SearchOutlined, RightOutlined } from '@ant-design/icons';
import client from '../api/client';
import dayjs from 'dayjs';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/students');
      setRows(data);
    } catch {
      message.error('학생 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredRows = rows.filter((r) => 
    r.name.includes(search) || r.gradeLabel.includes(search) || r.schoolLevel.includes(search)
  );

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* 프리미엄 헤더 섹션 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0, fontWeight: 800 }}>학생 관리</Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>학원의 모든 원생을 관리합니다.</Typography.Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          style={{ borderRadius: 12, height: 40, background: 'var(--primary-gradient)', border: 'none' }}
          onClick={() => navigate('/students/new')}
        >
          등록
        </Button>
      </div>

      {/* 검색 바 */}
      <Input
        prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
        placeholder="이름, 학교, 학년으로 검색"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="glass-effect"
        style={{ 
          marginBottom: 20, 
          height: 48, 
          borderRadius: 16, 
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      />

      {/* 학생 목록 (리스트 카드 형식) */}
      <List
        loading={loading}
        dataSource={filteredRows}
        renderItem={(item) => (
          <Card 
            key={item._id}
            className="glass-effect btn-tap"
            style={{ 
              marginBottom: 16, 
              borderRadius: 24, 
              border: 'none',
              cursor: 'pointer' 
            }}
            onClick={() => navigate(`/students/${item._id}`)}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Space size={16} align="center">
                <Avatar 
                  size={52} 
                  icon={<UserOutlined />} 
                  style={{ background: 'var(--primary-gradient)', border: '2px solid rgba(255,255,255,0.1)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography.Text strong style={{ fontSize: 17, marginBottom: 2 }}>{item.name}</Typography.Text>
                  <Space size={4}>
                    <Tag color="blue" bordered={false} style={{ fontSize: 10, borderRadius: 4 }}>{item.schoolLevel}</Tag>
                    <Tag color="cyan" bordered={false} style={{ fontSize: 10, borderRadius: 4 }}>{item.gradeLabel}</Tag>
                  </Space>
                </div>
              </Space>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                {item.leftAt ? (
                  <Tag color="default">퇴원</Tag>
                ) : (
                  <Tag color="green">재원중</Tag>
                )}
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                   {Number(item.monthlyTuition).toLocaleString()}원
                </Typography.Text>
              </div>
            </div>
            <div style={{ 
              marginTop: 16, 
              paddingTop: 12, 
              borderTop: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
               <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                등록일: {item.enrolledAt ? dayjs(item.enrolledAt).format('YYYY-MM-DD') : '-'}
              </Typography.Text>
              <Button type="text" size="small" icon={<RightOutlined />} style={{ color: 'var(--primary-vibrant)' }}>
                상세보기
              </Button>
            </div>
          </Card>
        )}
      />
    </div>
  );
}
