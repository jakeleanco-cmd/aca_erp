/**
 * client/src/pages/LeanmathPage.jsx
 * 
 * 린매쓰(LeanMath) 학생의 목록을 조회하고 CRUD(등록, 상세 수정, 삭제)를 지원하는 관리 화면입니다.
 * - 디자인 테마: 다크 모드에 특화된 글래스모피즘(glass-effect), 프리미엄 그라데이션, 마이크로 인터랙션 적용.
 * - 반응형 레이아웃: 넓은 화면에서는 테이블 뷰, 모바일 등 좁은 화면에서는 카드 리스트 뷰로 유연하게(Flexible Layout) 변환됩니다.
 * - 상세 데이터 탭 모달: 40여 개의 수강 및 상담 정보를 탭(기본정보, 수강정보, 학습/평가, 관리자 메모)으로 정리하여 사용자 편의성을 높였습니다.
 */

import { useEffect, useState } from 'react';
import { 
  Table, 
  Card, 
  Button, 
  Input, 
  Select, 
  Modal, 
  Form, 
  Tabs, 
  Tag, 
  Space, 
  Typography, 
  Avatar, 
  message, 
  Popconfirm,
  Row,
  Col,
  Divider,
  DatePicker
} from 'antd';
import dayjs from 'dayjs';
import { 
  UserOutlined, 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  PhoneOutlined, 
  BookOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  SaveOutlined,
  FileDoneOutlined,
  PrinterOutlined
} from '@ant-design/icons';
import { useLeanmathStore } from '../store/leanmathStore';

const { Title, Text } = Typography;
const { Option } = Select;

export default function LeanmathPage() {
  // 1. Zustand 스토어 상태 및 액션 연동
  const {
    students,
    loading,
    totalCount,
    page,
    limit,
    filters,
    fetchStudents,
    setFilters,
    setPage,
    setLimit,
    createStudent,
    updateStudent,
    deleteStudent,
  } = useLeanmathStore();

  // 2. 로컬 화면 상태값 정의
  const [isModalOpen, setIsModalOpen] = useState(false); // 상세/편집 모달 오픈 여부
  const [editingStudent, setEditingStudent] = useState(null); // 현재 수정 중인 학생 데이터 (null 이면 신규 등록)
  const [form] = Form.useForm(); // Antd 폼 인스턴스
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // 모바일 화면 감지
  const [activeTab, setActiveTab] = useState('basic'); // 모달 활성화 탭 관리
  const [isReportModalOpen, setIsReportModalOpen] = useState(false); // 리포트 모달 오픈 여부
  const [reportStudent, setReportStudent] = useState(null); // 리포트 대상 학생 데이터

  // 화면 리사이즈 감지 (Flexible Layout)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 초기 데이터 로딩
  useEffect(() => {
    fetchStudents();
  }, []);

  // 3-2. 경과 일수 계산 함수
  const getDaysAgoText = (dateStr) => {
    if (!dateStr) return '';
    const targetDate = dayjs(dateStr).startOf('day');
    const today = dayjs().startOf('day');
    const diffDays = today.diff(targetDate, 'day');
    if (diffDays === 0) return ' (오늘)';
    if (diffDays > 0) return ` (${diffDays}일 전)`;
    return ` (${Math.abs(diffDays)}일 후)`;
  };

  // 3. 상태(status) 태그 스타일 지정 함수
  const getStatusTag = (status) => {
    const s = String(status || '').trim();
    if (s === '대기') return <Tag color="orange" bordered={false}>대기</Tag>;
    if (s === '퇴원') return <Tag color="default" bordered={false}>퇴원</Tag>;
    return <Tag color="green" bordered={false}>재원</Tag>;
  };

  // 수업 시간 포맷터 헬퍼 함수
  const formatClassTime = (student) => {
    if (!student) return '';
    const dayMap = {
      '1': '월', '2': '화', '3': '수', '4': '목', '5': '금', '6': '토', '7': '일',
      '월': '월', '화': '화', '수': '수', '목': '목', '금': '금', '토': '토', '일': '일'
    };

    const formatPart = (day, time) => {
      if (!day && !time) return null;
      let dText = String(day || '').trim();
      if (dText && dayMap[dText.substring(0, 1)]) {
        dText = dayMap[dText.substring(0, 1)];
      }
      
      let tText = String(time || '').trim();
      if (tText && !isNaN(tText)) {
        tText = `${tText}:00`;
      }
      
      if (dText && tText) return `${dText} ${tText}`;
      return dText || tText;
    };

    const parts = [
      formatPart(student.class_day1, student.class_time1),
      formatPart(student.class_day2, student.class_time2),
      formatPart(student.class_day3, student.class_time3),
    ].filter(Boolean);

    return parts.join(', ') || '지정된 수업 시간 없음';
  };

  const handleOpenReportModal = (record) => {
    setReportStudent(record);
    setIsReportModalOpen(true);
  };

  // 4. 검색 필터 핸들러
  const handleSearch = (val) => {
    setFilters({ search: val });
  };

  const handleStatusFilter = (val) => {
    setFilters({ status: val === 'ALL' ? '' : val });
  };

  // 5. 모달 제어 함수 (등록 / 수정)
  const handleOpenAddModal = () => {
    setEditingStudent(null);
    form.resetFields();
    setActiveTab('basic');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (record, tabKey = 'basic') => {
    setEditingStudent(record);
    form.setFieldsValue({
      ...record,
      // 숫자 필드의 경우 포맷팅 안전성 확보
      fees: record.fees || 0,
      discount1: record.discount1 || 0,
      discount2: record.discount2 || 0,
    });
    setActiveTab(tabKey);
    setIsModalOpen(true);
  };

  // 6. 저장 처리 (추가 또는 업데이트)
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      
      if (editingStudent) {
        // 수정 모드
        await updateStudent(editingStudent._id, values);
        message.success(`${values.name || editingStudent.name} 학생의 정보가 수정되었습니다.`);
      } else {
        // 신규 등록 모드
        await createStudent(values);
        message.success(`${values.name || '신규'} 학생이 등록되었습니다.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      if (err.errorFields) {
        message.warning('입력 폼에 누락되거나 올바르지 않은 값이 있습니다.');
      } else {
        message.error(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
      }
    }
  };

  // 7. 삭제 처리
  const handleDelete = async (record) => {
    try {
      await deleteStudent(record._id);
      message.success(`${record.name} 학생이 정상 삭제되었습니다.`);
    } catch (err) {
      message.error('학생 삭제 중 오류가 발생했습니다.');
    }
  };

  // 8. PC용 테이블 컬럼 설정
  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <Space size={8} style={{ cursor: 'pointer' }} onClick={() => handleOpenEditModal(record)}>
          <Avatar icon={<UserOutlined />} style={{ background: 'var(--primary-gradient)' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status) => getStatusTag(status),
    },
    {
      title: '학교',
      dataIndex: 'school_name',
      key: 'school_name',
      render: (school) => school || <Text type="secondary">-</Text>,
    },
    {
      title: '학년',
      key: 'grade_info',
      render: (_, record) => {
        const grade1 = record.grade1 || '';
        const grade2 = record.grade2 || '';
        return grade1 || grade2 ? `${grade1} ${grade2}`.trim() : <Text type="secondary">-</Text>;
      },
    },
    {
      title: '시간표',
      dataIndex: 'class_name',
      key: 'class_name',
      render: (cls) => cls ? <Tag color="blue" bordered={false}>{cls}</Tag> : <Text type="secondary">-</Text>,
    },
    {
      title: '수강료',
      dataIndex: 'fees',
      key: 'fees',
      render: (fee) => fee ? `${Number(fee).toLocaleString()}원` : '0원',
    },
    {
      title: '연락처(부모)',
      dataIndex: 'm_phone',
      key: 'm_phone',
      render: (phone) => phone || <Text type="secondary">-</Text>,
    },
    {
      title: '최근 기록일',
      dataIndex: 'latest_record_date',
      key: 'latest_record_date',
      render: (date, record) => (
        <Space size={4}>
          <Button 
            size="small"
            type="text"
            icon={<FileDoneOutlined style={{ color: '#10b981' }} />}
            onClick={() => handleOpenReportModal(record)}
            title="리포트 보기"
            style={{ padding: 0 }}
          />
          <Button 
            size="small"
            type="text"
            icon={<FileTextOutlined style={{ color: 'var(--primary-vibrant)' }} />}
            onClick={() => handleOpenEditModal(record, 'learning')}
            title="학습 및 평가 바로가기"
            style={{ padding: 0 }}
          />
          {date ? `${date}${getDaysAgoText(date)}` : <Text type="secondary">-</Text>}
        </Space>
      ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Space size={8}>
          <Button 
            type="text" 
            icon={<EditOutlined style={{ color: 'var(--primary-vibrant)' }} />} 
            onClick={() => handleOpenEditModal(record)} 
          />
          <Popconfirm
            title="학생 정보를 정말 삭제하시겠습니까?"
            description="삭제하면 데이터를 복구할 수 없습니다."
            okText="예"
            cancelText="아니오"
            onConfirm={() => handleDelete(record)}
          >
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 9. 탭 아이템 정의 (상세 폼 탭 구성)
  const renderTabItems = () => [
    {
      key: 'basic',
      label: '기본 정보',
      forceRender: true,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item label="학생 이름" name="name" rules={[{ required: true, message: '이름을 입력해 주세요.' }]}>
              <Input placeholder="홍길동" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="아이디" name="user_id">
              <Input placeholder="user_id" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="비밀번호" name="password">
              <Input placeholder="111111" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="원생 상태" name="status" initialValue="재원">
              <Select className="glass-effect-select">
                <Option value="재원">재원</Option>
                <Option value="대기">대기</Option>
                <Option value="퇴원">퇴원</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="학교명" name="school_name">
              <Input placeholder="명일중" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item label="학교 구분" name="grade1" initialValue="중등">
              <Select className="glass-effect-select">
                <Option value="초등">초등</Option>
                <Option value="중등">중등</Option>
                <Option value="고등">고등</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} sm={6}>
            <Form.Item label="학년" name="grade2">
              <Input placeholder="2" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="학생 연락처" name="s_phone">
              <Input placeholder="010-XXXX-XXXX" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="어머니 연락처" name="m_phone">
              <Input placeholder="010-XXXX-XXXX" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="현금영수증 번호" name="receipt_phone">
              <Input placeholder="010-XXXX-XXXX" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="현금영수증 사용 여부" name="receipt_use" initialValue="미사용">
              <Select className="glass-effect-select">
                <Option value="사용">사용</Option>
                <Option value="미사용">미사용</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item label="입원일" name="start_date">
              <Input placeholder="YYYY-MM-DD" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12}>
            <Form.Item label="퇴원일" name="end_date">
              <Input placeholder="YYYY-MM-DD" className="glass-effect-input" />
            </Form.Item>
          </Col>
        </Row>
      )
    },
    {
      key: 'class',
      label: '수강 정보',
      forceRender: true,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Form.Item label="수강반 이름" name="class_name">
              <Input placeholder="월6금6" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="수강료" name="fees">
              <Input type="number" suffix="원" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="형제 할인" name="discount1">
              <Input type="number" suffix="원" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="기타 할인" name="discount2">
              <Input type="number" suffix="원" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label="할인 메모" name="discount_memo">
              <Input placeholder="형제 할인 5만원" className="glass-effect-input" />
            </Form.Item>
          </Col>
          
          <Col xs={24}><Divider style={{ margin: '8px 0' }}>요일 및 등원시간</Divider></Col>
          
          <Col xs={12} sm={8}>
            <Form.Item label="등원 요일 1" name="class_day1">
              <Input placeholder="예: 1 (월)" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="등원 요일 2" name="class_day2">
              <Input placeholder="예: 5 (금)" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="등원 요일 3" name="class_day3">
              <Input placeholder="비어있음" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="등원 시간 1" name="class_time1">
              <Input placeholder="예: 18" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="등원 시간 2" name="class_time2">
              <Input placeholder="예: 18" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={12} sm={8}>
            <Form.Item label="등원 시간 3" name="class_time3">
              <Input placeholder="비어있음" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}><Divider style={{ margin: '8px 0' }}>수강 등급</Divider></Col>
          <Col xs={8}>
            <Form.Item label="등급 1" name="level1">
              <Input className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item label="등급 2" name="level2">
              <Input className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item label="등급 3" name="level3">
              <Input className="glass-effect-input" />
            </Form.Item>
          </Col>
        </Row>
      )
    },
    {
      key: 'learning',
      label: '학습 및 평가',
      forceRender: true,
      children: (
        <Row gutter={[16, 16]}>
          {/* 상단 닫기 / 저장 버튼 세트 */}
          <Col xs={24} style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingBottom: 8 }}>
            <Button 
              onClick={() => setIsModalOpen(false)}
              style={{ borderRadius: 10 }}
            >
              닫기
            </Button>
            <Button 
              type="primary" 
              onClick={handleSave}
              style={{ 
                borderRadius: 10, 
                background: 'var(--primary-gradient)', 
                border: 'none',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
              }}
            >
              저장
            </Button>
          </Col>

          <Col xs={24} sm={12}>
            <Form.Item 
              label="최근 기록 날짜" 
              name="latest_record_date"
              getValueProps={(val) => ({ value: val ? dayjs(val) : null })}
              normalize={(val) => val ? val.format('YYYY-MM-DD') : null}
            >
              <DatePicker 
                style={{ width: '100%' }} 
                placeholder="날짜 선택" 
                format="YYYY-MM-DD"
                className="glass-effect-input"
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="자기주도학습시간" name="study_time">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="자기주도학습 시간 기록" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="레벨 테스트 결과" name="level_test">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="레벨 테스트 날짜 및 점수 기록" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="교재 이력" name="book_history">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="학습한 교재 목록 기입" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="학습 진행도" name="study_progress">
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="연산선행, 개념선행, 현행심화 등 진행 내역" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="단원 평가 결과" name="chapter_test">
              <Input.TextArea autoSize={{ minRows: 3, maxRows: 8 }} placeholder="기본과정, 실력과정 중단원/대단원 테스트 결과" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="과정 평가" name="course_test">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 5 }} placeholder="학기/전체 과정 종합 테스트 결과" className="glass-effect-input" />
            </Form.Item>
          </Col>
        </Row>
      )
    },
    {
      key: 'memos',
      label: '관리자 메모',
      forceRender: true,
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24}>
            <Form.Item label="학생 성향 및 종합 특이사항" name="memo">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="학생의 성향, 습관, 주의할 점 등 기입" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="자기주도학습 계획 및 학습평" name="study_memo">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="요일별 학습시간, 학습 주안점 기입" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="내신 대비 기록" name="test_memo">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 6 }} placeholder="기출문제 풀이 점수, 내신 성적 등 기록" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="결석 및 보충 내역" name="off_memo">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} placeholder="결석 사유 및 보충 여부 기입" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item label="교재 풀이 주기 / 검사 메모" name="check_memo">
              <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="형제자매 정보" name="sibling_name">
              <Input placeholder="예: 초6 이효린" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="형제자매 특이사항" name="sibling_memo">
              <Input className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="주거 단지" name="house">
              <Input placeholder="고래힐" className="glass-effect-input" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label="어머니 메모" name="mom_memo">
              <Input className="glass-effect-input" />
            </Form.Item>
          </Col>
        </Row>
      )
    }
  ];

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* 1. 프리미엄 페이지 헤더 */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 800, background: 'var(--primary-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            린매쓰 학생 관리
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            json 파일로부터 이관된 린매쓰(LeanMath) 수강생 데이터의 조회 및 CRUD 작업을 진행합니다.
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          style={{ 
            borderRadius: 12, 
            height: 40, 
            background: 'var(--primary-gradient)', 
            border: 'none',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'
          }}
          onClick={handleOpenAddModal}
        >
          원생 등록
        </Button>
      </div>

      {/* 2. 검색 및 상태 필터 영역 */}
      <Card 
        className="glass-effect" 
        style={{ 
          marginBottom: 20, 
          borderRadius: 20, 
          border: '1px solid var(--glass-border)', 
          background: 'var(--bg-card)',
          boxShadow: 'var(--card-shadow)'
        }}
        bodyStyle={{ padding: 16 }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={14} md={16}>
            <Input
              prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />}
              placeholder="학생 이름, 학교명, 또는 수강반 이름으로 통합 검색..."
              allowClear
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              style={{ 
                height: 44, 
                borderRadius: 14, 
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-main)'
              }}
            />
          </Col>
          <Col xs={24} sm={10} md={8}>
            <Select
              placeholder="재원 상태 필터"
              value={filters.status || 'ALL'}
              onChange={handleStatusFilter}
              style={{ width: '100%', height: 44 }}
              className="glass-select-large"
              popupClassName="glass-select-popup"
            >
              <Option value="ALL">전체 상태 보기</Option>
              <Option value="재원">재원</Option>
              <Option value="대기">대기</Option>
              <Option value="퇴원">퇴원</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 3. 총 건수 인디케이터 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
          검색 결과: <span style={{ color: 'var(--primary-vibrant)', fontWeight: 700, fontSize: 15 }}>{totalCount}</span>명
        </Text>
      </div>

      {/* 4. 리스트 뷰 (Flexible Layout): PC용 테이블 / 모바일용 카드 리스트 */}
      {!isMobile ? (
        // A. PC 뷰: Antd Table (반응형 폭 지원)
        <Table
          columns={columns}
          dataSource={students}
          rowKey="_id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: limit,
            total: totalCount,
            onChange: (p) => setPage(p),
            onShowSizeChange: (_, size) => setLimit(size),
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
            style: { marginTop: 20 }
          }}
          className="glass-table"
          scroll={{ x: 'max-content' }}
        />
      ) : (
        // B. 모바일/태블릿 뷰: 터치에 친화적인 카드 리스트 뷰
        <div>
          {students.map((item) => (
            <Card 
              key={item._id}
              className="glass-effect btn-tap"
              style={{ 
                marginBottom: 16, 
                borderRadius: 20, 
                border: '1px solid var(--glass-border)',
                background: 'var(--bg-card)',
                boxShadow: 'var(--card-shadow)'
              }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <Space size={12}>
                  <Avatar size={40} icon={<UserOutlined />} style={{ background: 'var(--primary-gradient)' }} />
                  <div>
                    <Typography.Text strong style={{ fontSize: 16 }}>{item.name}</Typography.Text>
                    <div style={{ marginTop: 2 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.school_name ? `${item.school_name} ${item.grade2 || ''}`.trim() : '학교미정'}
                      </Text>
                    </div>
                  </div>
                </Space>
                {getStatusTag(item.status)}
              </div>
              
              <div style={{ 
                padding: '12px 14px', 
                background: 'rgba(0,0,0,0.02)', 
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                marginBottom: 14
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <Text type="secondary"><CalendarOutlined style={{ marginRight: 6 }} />수강반</Text>
                  <Text strong>{item.class_name || '-'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <Text type="secondary"><DollarOutlined style={{ marginRight: 6 }} />수강료</Text>
                  <Text strong>{item.fees ? `${Number(item.fees).toLocaleString()}원` : '0원'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <Text type="secondary"><PhoneOutlined style={{ marginRight: 6 }} />비상연락처</Text>
                  <Text>{item.m_phone || '-'}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <Text type="secondary"><CalendarOutlined style={{ marginRight: 6 }} />최근 기록일</Text>
                  <Space size={4}>
                    <Button 
                      size="small"
                      type="text"
                      icon={<FileDoneOutlined style={{ color: '#10b981' }} />}
                      onClick={() => handleOpenReportModal(item)}
                      title="리포트 보기"
                      style={{ padding: '0 4px', height: 22 }}
                    />
                    <Button 
                      size="small"
                      type="text"
                      icon={<FileTextOutlined style={{ color: 'var(--primary-vibrant)' }} />}
                      onClick={() => handleOpenEditModal(item, 'learning')}
                      title="학습 및 평가 바로가기"
                      style={{ padding: '0 4px', height: 22 }}
                    />
                    <Text strong>{item.latest_record_date ? `${item.latest_record_date}${getDaysAgoText(item.latest_record_date)}` : '-'}</Text>
                  </Space>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 10, borderTop: '1px solid var(--glass-border)' }}>
                <Button 
                  size="small" 
                  type="text" 
                  icon={<EditOutlined />} 
                  style={{ color: 'var(--primary-vibrant)', fontWeight: 600 }}
                  onClick={() => handleOpenEditModal(item)}
                >
                  상세수정
                </Button>
                <Popconfirm
                  title="정말 삭제하시겠습니까?"
                  okText="삭제"
                  cancelText="취소"
                  onConfirm={() => handleDelete(item)}
                >
                  <Button 
                    size="small" 
                    type="text" 
                    danger 
                    icon={<DeleteOutlined />}
                    style={{ fontWeight: 600 }}
                  >
                    삭제
                  </Button>
                </Popconfirm>
              </div>
            </Card>
          ))}
          
          {/* 모바일 하단 간단 페이지네이션 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24 }}>
            <Button 
              disabled={page <= 1} 
              onClick={() => setPage(page - 1)}
              style={{ borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
            >
              이전
            </Button>
            <Text type="secondary">{page} / {Math.ceil(totalCount / limit) || 1} 페이지</Text>
            <Button 
              disabled={page >= Math.ceil(totalCount / limit)} 
              onClick={() => setPage(page + 1)}
              style={{ borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--glass-border)' }}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      {/* 5. 등록 및 상세 편집 탭 모달 */}
      <Modal
        title={
          <Title level={4} style={{ margin: 0, fontWeight: 800 }}>
            {editingStudent ? `[${editingStudent.name}] 원생 상세 정보` : '신규 린매쓰 원생 등록'}
          </Title>
        }
        open={isModalOpen}
        onOk={handleSave}
        onCancel={() => setIsModalOpen(false)}
        okText="저장"
        cancelText="닫기"
        width={750}
        destroyOnClose
        style={{ top: 40 }}
        bodyStyle={{ padding: '10px 0' }}
        className="glass-modal"
      >
        <Form 
          form={form} 
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={renderTabItems()}
            className="leanmath-tabs"
            style={{ padding: '0 8px' }}
          />
        </Form>
      </Modal>

      {/* 6. 리포트 모달 */}
      <Modal
        title={null}
        open={isReportModalOpen}
        onCancel={() => setIsReportModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsReportModalOpen(false)}>
            닫기
          </Button>,
          <Button key="print" type="primary" icon={<PrinterOutlined />} onClick={() => window.print()}>
            출력
          </Button>
        ]}
        width={720}
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
        className="report-modal"
      >
        {reportStudent && (
          <div className="report-print-area" style={{
            background: '#fff',
            color: '#1e293b',
            fontFamily: '"Pretendard", "Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
            padding: '40px 45px',
            minHeight: '840px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* 리포트 헤더 */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '14px' }}>
              <div style={{ fontSize: '13px', letterSpacing: '4px', textTransform: 'uppercase', color: '#64748b', marginBottom: '6px' }}>
                LeanMath Student Report
              </div>
              <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                {reportStudent.name} <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#475569' }}>({formatClassTime(reportStudent)})</span>
              </h1>
            </div>

            {/* 리포트 본문 - 왼쪽 정렬 순차 레이아웃 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
              
              {/* 1. 인적사항 */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderLeft: '4px solid #3b82f6', paddingLeft: '8px', marginBottom: '8px' }}>
                  인적사항
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', paddingLeft: '12px', fontSize: '13px', color: '#334155' }}>
                  <div><strong>학교 / 학년 :</strong> {reportStudent.school_name || '-'} / {reportStudent.grade1 || ''} {reportStudent.grade2 || ''}</div>
                  <div><strong>수강 등급 :</strong> {reportStudent.level1 || '미정'} {reportStudent.level2 ? ` / ${reportStudent.level2}` : ''} {reportStudent.level3 ? ` / ${reportStudent.level3}` : ''}</div>
                  <div><strong>학생 연락처 :</strong> {reportStudent.s_phone || '-'}</div>
                  <div><strong>학부모 연락처 :</strong> {reportStudent.m_phone || '-'}</div>
                  <div><strong>원생 상태 :</strong> {reportStudent.status || '-'}</div>
                  <div><strong>입원일 :</strong> {reportStudent.start_date || '-'}</div>
                </div>
              </div>

              {/* 2. 자기주도학습시간 */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderLeft: '4px solid #3b82f6', paddingLeft: '8px', marginBottom: '8px' }}>
                  자기주도학습시간
                </h3>
                <div style={{ paddingLeft: '12px', fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {reportStudent.study_time || '기록된 자기주도학습시간이 없습니다.'}
                </div>
              </div>

              {/* 3. 레벨테스트 */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderLeft: '4px solid #3b82f6', paddingLeft: '8px', marginBottom: '8px' }}>
                  레벨테스트
                </h3>
                <div style={{ paddingLeft: '12px', fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {reportStudent.level_test || '기록된 레벨테스트 결과가 없습니다.'}
                </div>
              </div>

              {/* 4. 교재이력 */}
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderLeft: '4px solid #3b82f6', paddingLeft: '8px', marginBottom: '8px' }}>
                  교재이력
                </h3>
                <div style={{ paddingLeft: '12px', fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {reportStudent.book_history || '기록된 교재 이력이 없습니다.'}
                </div>
              </div>

              {/* 5. 과정평가 결과 */}
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', borderLeft: '4px solid #3b82f6', paddingLeft: '8px', marginBottom: '8px' }}>
                  과정평가 결과
                </h3>
                <div style={{ paddingLeft: '12px', fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                  {reportStudent.course_test || '기록된 과정평가 결과가 없습니다.'}
                </div>
              </div>

            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
