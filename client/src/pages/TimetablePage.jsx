import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Space, Typography, message, Spin } from 'antd';
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
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin />
      </div>
    );
  }

  return (
    <div>
      <Typography.Title level={4}>수업시간표 대시보드</Typography.Title>
      <Typography.Paragraph type="secondary">
        각 슬롯은 2시간 수업 기준으로 운영한다고 가정합니다. (표시용 라벨·시간은 수업시간 설정에서 관리)
      </Typography.Paragraph>
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {grid.map((slot) => (
          <Card
            key={slot._id}
            title={
              <span>
                {slot.weekdayKo} {slot.startTime}
                {slot.label ? ` · ${slot.label}` : ''}
              </span>
            }
            size="small"
          >
            <List
              size="small"
              dataSource={slot.students}
              locale={{ emptyText: '배정된 학생이 없습니다.' }}
              renderItem={(stu) => (
                <List.Item>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Typography.Text strong>{stu.name}</Typography.Text>
                    <Space wrap>
                      <Button size="small" onClick={() => navigate(`/students/${stu._id}`)}>
                        학생 상세
                      </Button>
                      <Button size="small" type="primary" onClick={() => navigate(`/students/${stu._id}/learning`)}>
                        학습관리
                      </Button>
                    </Space>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
