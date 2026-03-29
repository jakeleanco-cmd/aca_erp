import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Space, Typography, message, Spin, Tag, Empty } from 'antd';
import { ClockCircleOutlined, UserOutlined, RightOutlined } from '@ant-design/icons';
import client from '../api/client';

export default function TimetablePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await client.get('/timetable/dashboard');
        setGrid(data);
      } catch {
        message.error('시간표를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div style={{ height: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ margin: '0 0 8px 0', fontWeight: 800 }}>전체 시간표</Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          슬롯별 배정된 학생들을 한눈에 확인하세요.
        </Typography.Text>
      </div>

      {grid.length === 0 ? (
        <Card className="glass-effect" style={{ padding: 40, textAlign: 'center' }}>
          <Empty description="등록된 수업 슬롯이 없습니다." />
          <Button type="primary" style={{ marginTop: 16 }} onClick={() => navigate('/class-slots')}>
            슬롯 설정하러 가기
          </Button>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grid.map((slot) => {
            // '재원' 상태인 학생만 필터링
            const enrolledStudents = slot.students.filter(s => s.status === '재원');
            
            return (
              <Card
                key={slot._id}
                className="glass-effect"
                style={{ border: 'none', borderRadius: 24 }}
                title={
                  <Space>
                    <ClockCircleOutlined style={{ color: 'var(--primary-vibrant)' }} />
                    <span style={{ fontWeight: 700, fontSize: 16 }}>
                      {slot.weekdayKo} <span style={{ color: 'var(--primary-vibrant)' }}>{slot.startTime}</span>
                    </span>
                    {slot.label && <Tag color="blue" bordered={false} style={{ borderRadius: 6, fontSize: 11 }}>{slot.label}</Tag>}
                  </Space>
                }
                extra={<Tag color="default">{enrolledStudents.length}명</Tag>}
              >
                <List
                  dataSource={enrolledStudents}
                  renderItem={(stu) => (
                    <List.Item 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}
                      actions={[
                        <Button 
                          key="manage"
                          type="text" 
                          size="small"
                          icon={<RightOutlined />}
                          style={{ color: 'var(--primary-vibrant)' }}
                          onClick={() => navigate(`/students/${stu._id}/learning`)}
                        />
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div style={{ 
                            width: 36, height: 36, borderRadius: 10, 
                            background: 'rgba(99, 102, 241, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <UserOutlined style={{ color: 'var(--primary-vibrant)' }} />
                          </div>
                        }
                        title={<span style={{ fontWeight: 600 }}>{stu.name}</span>}
                        description={<span style={{ fontSize: 12 }}>{stu.schoolLevel} {stu.gradeLabel}</span>}
                      />
                    </List.Item>
                  )}
                  locale={{ emptyText: <Typography.Text type="secondary">배정된 재원생이 없습니다.</Typography.Text> }}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
