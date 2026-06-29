/**
 * server/models/LeanmathStudent.js
 * 
 * leanmath.json의 student 테이블 데이터 구조를 그대로 저장하기 위한 Mongoose 스키마 모델입니다.
 * 기존 Student 모델과의 충돌을 피하기 위해 독자적인 이름으로 명명했습니다.
 * 유연한 데이터 처리를 위해 strict: false 옵션을 적용하여 JSON 내의 다양한 추가 메타데이터도 안전하게 보존합니다.
 */

const mongoose = require('mongoose');

const leanmathStudentSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true }, // leanmath.json에서의 고유 ID
    workspace: { type: String, default: 'leanmath' },
    flag: { type: String, default: '1' },
    modified_time: { type: String },
    status: { type: String, default: '재원', trim: true }, // 원생 상태 (재원, 퇴원, 대기 등)
    name: { type: String, required: true, trim: true }, // 학생 이름
    class_name: { type: String, trim: true }, // 분반 이름 (예: 월6금6)
    user_id: { type: String, trim: true }, // 사용자 아이디
    start_date: { type: String, default: null }, // 입원일
    end_date: { type: String, default: null }, // 퇴원일
    
    // 학부모 상담 및 리포트 관련
    report_short_memo: { type: String, default: '' },
    report_date: { type: String, default: null },
    report_update_date: { type: String, default: null },
    report_type: { type: String, default: null },
    
    // 학습 상태 관련 긴 메모 필드들
    study_time: { type: String, default: null },
    level_test: { type: String, default: null },
    book_history: { type: String, default: null },
    course_test: { type: String, default: null },
    study_progress: { type: String, default: null },
    chapter_test: { type: String, default: null },
    latest_record_date: { type: String, default: null }, // 최근 기록 날짜 (학습/평가 탭에서 관리)
    study_point: { type: String, default: null },
    s_memo: { type: String, default: null },
    
    // 기본 개인정보
    password: { type: String, default: '111111' },
    grade: { type: String, default: null }, // 학년
    grade1: { type: String, default: '중등' }, // 학급 구분 (초등, 중등, 고등)
    school_name: { type: String, default: null, trim: true }, // 학교명
    grade2: { type: String, default: null }, // 상세 학년
    
    // 수강 등급
    level1: { type: String, default: '미정' },
    level2: { type: String, default: '미정' },
    level3: { type: String, default: '미정' },
    
    // 등원 요일 및 시간
    class_day1: { type: String, default: '' },
    class_time1: { type: String, default: '' },
    class_day2: { type: String, default: '' },
    class_time2: { type: String, default: '' },
    class_day3: { type: String, default: '' },
    class_time3: { type: String, default: '' },
    
    // 원비 및 할인
    fees: { type: Number, default: 0 },
    discount1: { type: Number, default: 0 },
    discount2: { type: Number, default: 0 },
    discount_memo: { type: String, default: null },
    
    // 관리자 종합 메모들
    memo: { type: String, default: '' },
    study_memo: { type: String, default: '' },
    test_memo: { type: String, default: null },
    check_memo: { type: String, default: '' },
    off_memo: { type: String, default: null },
    rookie: { type: String, default: '' },
    
    // 가족 정보 및 주거
    sibling_name: { type: String, default: null },
    sibling_memo: { type: String, default: '0' },
    house: { type: String, default: '' },
    distance: { type: String, default: '' },
    
    // 연락처 정보
    s_phone: { type: String, default: '', trim: true }, // 학생 연락처
    m_phone: { type: String, default: '', trim: true }, // 어머니 연락처
    mom_memo: { type: String, default: '' },
    receipt_phone: { type: String, default: '', trim: true }, // 현금영수증 발행 번호
    receipt_use: { type: String, default: '미사용' } // 영수증 발행 여부
  },
  { 
    timestamps: true,
    strict: false // 유연한 JSON 스키마 필드 보존을 위해 false 설정
  }
);

// 데이터베이스 조회 최적화를 위한 인덱스 설정
leanmathStudentSchema.index({ name: 'text', school_name: 'text', class_name: 'text' });

module.exports = mongoose.models.LeanmathStudent || mongoose.model('LeanmathStudent', leanmathStudentSchema);
