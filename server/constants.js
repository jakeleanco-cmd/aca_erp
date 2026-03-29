/**
 * 학습종류 표시·정렬 순서 (비즈니스 규칙: 항상 이 순서)
 */
const LEARNING_TYPE_ORDER = ['연산선행', '응용선행', '현행심화'];

/** 학년 구분 */
const SCHOOL_LEVELS = ['초등', '중등', '고등'];

/** 교재 학습수준 */
const TEXTBOOK_LEVELS = ['연산', '개념', '기초', '기본', '실력', '심화'];

/** 단원 진행 상태 */
const UNIT_STATUSES = ['학습예정', '학습중', '학습완료', '학습보류'];

/** 평가 유형 */
const ASSESSMENT_TYPES = ['단원평가', '과정평가'];

/** 요일 (한국어, 월~일) */
const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];

module.exports = {
  LEARNING_TYPE_ORDER,
  SCHOOL_LEVELS,
  TEXTBOOK_LEVELS,
  UNIT_STATUSES,
  ASSESSMENT_TYPES,
  WEEKDAYS_KO,
};
