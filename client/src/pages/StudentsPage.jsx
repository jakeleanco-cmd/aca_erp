import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { List, Button, Tag, message, Avatar, Typography, Card, Input, Space, Segmented } from 'antd';
import { UserOutlined, PlusOutlined, SearchOutlined, RightOutlined } from '@ant-design/icons';
import client from '../api/client';
import dayjs from 'dayjs';

export default function StudentsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('재원'); // 기본값: 재원

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

  const filteredRows = rows.filter((r) => {
    // 1. 검색어 필터
    const matchesSearch = 
      r.name.includes(search) || 
      r.gradeLabel.includes(search) || 
      r.schoolLevel.includes(search);
    
    // 2. 상태 필터
    const matchesStatus = filterStatus === '전체' || r.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusTag = (status) => {
    switch (status) {
      case '대기': return <Tag color="orange" bordered={false}>대기</Tag>;
      case '퇴원': return <Tag color="default" bordered={false}>퇴원</Tag>;
      default: return <Tag color="green" bordered={false}>재원중</Tag>;
    }
  };

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

      {/* 검색 및 필터 바 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <Input
          prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
          placeholder="이름, 학년 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="glass-effect"
          style={{ 
            flex: 1,
            height: 44, 
            borderRadius: 14, 
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        />
        <Button 
          className="glass-effect"
          style={{ 
            height: 44, 
            borderRadius: 14, 
            background: filterStatus === '전체' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: filterStatus === '전체' ? 'var(--primary-vibrant)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: 13
          }}
          onClick={() => setFilterStatus('전체')}
        >
          전체 보기
        </Button>
      </div>

      {/* 상태 필터 (세그먼트 스타일) */}
      <Segmented
        block
        value={filterStatus === '전체' ? '전체' : filterStatus}
        onChange={(value) => setFilterStatus(value)}
        options={[
          { label: '전체', value: '전체' },
          { label: '재원', value: '재원' },
          { label: '대기', value: '대기' },
          { label: '퇴원', value: '퇴원' },
        ]}
        className="glass-effect"
        style={{ 
          marginBottom: 24, 
          padding: 4, 
          borderRadius: 14,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      />

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Typography.Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
          총 <span style={{ color: 'var(--primary-vibrant)', fontWeight: 700 }}>{filteredRows.length}</span>명
        </Typography.Text>
      </div>

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
                {getStatusTag(item.status)}
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
               <Space direction="vertical" size={0}>
                  {item.enrolledAt && dayjs(item.enrolledAt).year() > 2000 && (
                    <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                      등록일: {dayjs(item.enrolledAt).format('YYYY-MM-DD')}
                    </Typography.Text>
                  )}
                  {item.status === '퇴원' && item.leftAt && dayjs(item.leftAt).year() > 2000 && (
                    <Typography.Text type="danger" style={{ fontSize: 11, fontWeight: 600 }}>
                      퇴원일: {dayjs(item.leftAt).format('YYYY-MM-DD')}
                    </Typography.Text>
                  )}
               </Space>
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
