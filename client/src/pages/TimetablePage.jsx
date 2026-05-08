import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, List, Button, Space, Typography, message, Spin, Tag, Empty, Popconfirm, Modal, Select, Dropdown } from 'antd';
import { ClockCircleOutlined, UserOutlined, RightOutlined, CreditCardOutlined, DollarOutlined, PlusOutlined, CalendarOutlined, PlusCircleOutlined } from '@ant-design/icons';
import client from '../api/client';
import { useUiStore } from '../store/uiStore';
import { useMemo } from 'react';

export default function TimetablePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [grid, setGrid] = useState([]);
  const { viewMode } = useUiStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [students, setStudents] = useState([]);
  const [targetStudentId, setTargetStudentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const weekdays = ['월', '화', '수', '목', '금', '토', '일'];

  // 웹 모드용 그리드 데이터 가공
  const timeMatrix = useMemo(() => {
    if (viewMode !== 'web' || grid.length === 0) return null;

    // 모든 고유 시작 시간 추출 및 정렬
    const uniqueTimes = [...new Set(grid.map(s => s.startTime))].sort();
    
    // 행(시간) x 열(요일) 매트릭스 생성
    return uniqueTimes.map(time => {
      const row = { time, key: time };
      weekdays.forEach(day => {
        row[day] = grid.find(s => s.weekdayKo === day && s.startTime === time) || null;
      });
      return row;
    });
  }, [grid, viewMode]);

  const fetchTimetable = async () => {
    try {
      const { data } = await client.get('/timetable/dashboard');
      setGrid(data);
    } catch {
      message.error('시간표를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await client.get('/students');
      setStudents(data);
    } catch {
      message.error('학생 목록을 불러오지 못했습니다.');
    }
  };

  const handleAssignExisting = (slot) => {
    setSelectedSlot(slot);
    setTargetStudentId(null);
    setIsModalOpen(true);
  };

  const onAssignSubmit = async () => {
    if (!targetStudentId || !selectedSlot) return;
    setSubmitting(true);
    try {
      // 1. 학생의 상세 정보(기존 슬롯 목록 포함) 조회
      const { data: stu } = await client.get(`/students/${targetStudentId}`);
      
      // 2. 기존 슬롯에 현재 슬롯 추가 (중복 방지)
      const currentSlotIds = (stu.classSlotIds || []).map(s => typeof s === 'object' ? s._id : s);
      if (currentSlotIds.includes(selectedSlot._id)) {
        message.warning('이미 배정된 학생입니다.');
        setIsModalOpen(false);
        return;
      }

      await client.put(`/students/${targetStudentId}`, {
        classSlotIds: [...currentSlotIds, selectedSlot._id]
      });

      message.success('학생이 배정되었습니다.');
      setIsModalOpen(false);
      await fetchTimetable();
    } catch (err) {
      message.error('배정에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const generateBill = async (studentId, yearMonth) => {
    try {
      await client.post('/bills/generate-single', { studentId, yearMonth });
      message.success('고지서가 생성되었습니다.');
      await fetchTimetable();
    } catch (err) {
      message.error(err.response?.data?.message || '고지서 생성에 실패했습니다.');
    }
  };

  const payCard = async (billId) => {
    try {
      await client.post(`/bills/${billId}/pay-card`);
      message.success('카드 수납 처리되었습니다.');
      await fetchTimetable();
    } catch (err) {
      message.error(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const payCash = async (billId) => {
    try {
      await client.post(`/bills/${billId}/pay-cash`);
      message.success('현금 수납 처리되었습니다.');
      await fetchTimetable();
    } catch (err) {
      message.error(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

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
      ) : viewMode === 'web' ? (
        /* 웹 전용 그리드 뷰 (Table) */
        <Card className="glass-effect" style={{ border: 'none', borderRadius: 24, padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.08)', width: 100 }}>시간</th>
                {weekdays.map(day => (
                  <th key={day} style={{ padding: '16px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 800 }}>
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {timeMatrix.map(row => (
                <tr key={row.time}>
                  <td style={{ 
                    padding: '16px', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'var(--primary-vibrant)',
                    background: 'rgba(255,255,255,0.02)'
                  }}>
                    {row.time}
                  </td>
                  {weekdays.map(day => {
                    const slot = row[day];
                    const enrolledStudents = slot ? slot.students.filter(s => s.status === '재원') : [];
                    
                    return (
                      <td key={day} style={{ 
                        padding: '12px', 
                        border: '1px solid rgba(255,255,255,0.08)',
                        verticalAlign: 'top',
                        minHeight: 120,
                        background: slot ? 'rgba(99, 102, 241, 0.03)' : 'transparent'
                      }}>
                        {slot && (
                          <div>
                            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{slot.label}</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Dropdown
                                  menu={{
                                    items: [
                                      { key: 'existing', label: '기존 학생 배정', onClick: () => handleAssignExisting(slot) },
                                      { key: 'new', label: '신규 학생 등록', onClick: () => navigate(`/students/new?slotId=${slot._id}`) },
                                    ]
                                  }}
                                  trigger={['click']}
                                >
                                  <span style={{ cursor: 'pointer', padding: '4px' }} className="btn-tap">
                                    <PlusCircleOutlined style={{ color: 'var(--primary-vibrant)', fontSize: 16 }} />
                                  </span>
                                </Dropdown>
                                <Tag color="default" style={{ fontSize: 10, margin: 0 }}>{enrolledStudents.length}명</Tag>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {enrolledStudents.map(stu => (
                                <div 
                                  key={stu._id}
                                  className="glass-effect"
                                  style={{ 
                                    padding: '10px', 
                                    background: 'rgba(255,255,255,0.05)',
                                    borderRadius: 12,
                                    fontSize: 14,
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'var(--text-main)'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                      <span style={{ fontWeight: 700, fontSize: 14 }}>{stu.name}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stu.gradeLabel}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {stu.billStatus === '완납' && (
                                        <Tag color="green" bordered={false} style={{ fontSize: 10, margin: 0, padding: '0 4px', borderRadius: 4 }}>완납</Tag>
                                      )}
                                    </div>
                                  </div>

                                  <Space size={4} wrap>
                                    {/* 수납/고지서 버튼 */}
                                    {!stu.billId ? (
                                      <Popconfirm 
                                        title="고지서를 생성하시겠습니까?" 
                                        onConfirm={() => generateBill(stu._id, slot.yearMonth)}
                                      >
                                        <Button size="small" type="dashed" style={{ fontSize: 10, height: 22, padding: '0 4px' }}>고지서</Button>
                                      </Popconfirm>
                                    ) : stu.billStatus === '미납' ? (
                                      <>
                                        <Button 
                                          size="small" 
                                          onClick={() => payCard(stu.billId)}
                                          style={{ fontSize: 10, height: 22, padding: '0 4px', color: '#ff4d4f', borderColor: '#ff4d4f' }}
                                        >
                                          카드
                                        </Button>
                                        <Button 
                                          size="small" 
                                          onClick={() => payCash(stu.billId)}
                                          style={{ fontSize: 10, height: 22, padding: '0 4px', color: '#ff4d4f', borderColor: '#ff4d4f' }}
                                        >
                                          현금
                                        </Button>
                                      </>
                                    ) : null}

                                    <Button 
                                      size="small" 
                                      style={{ fontSize: 10, height: 22, padding: '0 4px' }}
                                      onClick={() => navigate(`/students/${stu._id}`)}
                                    >
                                      상세
                                    </Button>
                                    <Button 
                                      size="small" 
                                      type="primary"
                                      style={{ fontSize: 10, height: 22, padding: '0 4px' }}
                                      onClick={() => navigate(`/students/${stu._id}/learning`)}
                                    >
                                      학습
                                    </Button>
                                  </Space>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        /* 모바일 전용 카드 리스트 뷰 */
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
                extra={
                  <Space>
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'existing', label: '기존 학생 배정', onClick: () => handleAssignExisting(slot) },
                          { key: 'new', label: '신규 학생 등록', onClick: () => navigate(`/students/new?slotId=${slot._id}`) },
                        ]
                      }}
                      trigger={['click']}
                    >
                      <Button type="text" icon={<PlusOutlined />} size="small" style={{ color: 'var(--primary-vibrant)' }} />
                    </Dropdown>
                    <Tag color="default">{enrolledStudents.length}명</Tag>
                  </Space>
                }
              >
                <List
                  dataSource={enrolledStudents}
                  renderItem={(stu) => (
                    <List.Item 
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}
                      actions={[
                        // 수납 상태 버튼
                        !stu.billId ? (
                          <Popconfirm 
                            key="gen-bill"
                            title="당월 고지서를 생성하시겠습니까?" 
                            onConfirm={() => generateBill(stu._id, slot.yearMonth)}
                          >
                            <Button size="small" type="dashed" icon={<PlusOutlined />} style={{ fontSize: 11 }}>
                              고지서
                            </Button>
                          </Popconfirm>
                        ) : stu.billStatus === '미납' ? (
                          <Space key="pay-group" size={4}>
                            <Button 
                              size="small" 
                              icon={<CreditCardOutlined />} 
                              onClick={() => payCard(stu.billId)}
                              style={{ fontSize: 11, padding: '0 4px' }}
                            >
                              카드
                            </Button>
                            <Button 
                              size="small" 
                              icon={<DollarOutlined />} 
                              onClick={() => payCash(stu.billId)}
                              style={{ fontSize: 11, padding: '0 4px' }}
                            >
                              현금
                            </Button>
                          </Space>
                        ) : (
                          <Tag key="paid-tag" color="green" bordered={false} style={{ fontSize: 10, margin: 0 }}>수납완료</Tag>
                        ),
                        // 관리 버튼
                        <Button 
                          key="detail"
                          type="text" 
                          size="small"
                          style={{ color: '#888', fontSize: 12 }}
                          onClick={() => navigate(`/students/${stu._id}`)}
                        >
                          상세보기
                        </Button>,
                        <Button 
                          key="learning"
                          type="link" 
                          size="small"
                          style={{ fontSize: 12, fontWeight: 600 }}
                          onClick={() => navigate(`/students/${stu._id}/learning`)}
                        >
                          학습관리
                        </Button>
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
      {/* 기존 학생 배정 모달 */}
      <Modal
        title="수업 학생 배정"
        open={isModalOpen}
        onOk={onAssignSubmit}
        onCancel={() => setIsModalOpen(false)}
        confirmLoading={submitting}
        okText="배정하기"
        cancelText="취소"
        className="glass-effect"
        bodyStyle={{ paddingTop: 16 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            {selectedSlot?.weekdayKo}요일 {selectedSlot?.startTime} 수업에 참여할 학생을 선택하세요.
          </Typography.Text>
        </div>
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="학생 이름 검색"
          optionFilterProp="children"
          onChange={(val) => setTargetStudentId(val)}
          value={targetStudentId}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          options={students.map(s => ({
            value: s._id,
            label: `${s.name} (${s.schoolLevel} ${s.gradeLabel})`
          }))}
        />
      </Modal>
    </div>
  );
}
