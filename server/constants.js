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

/** ── 형성평가 분류 ── */
const FORMATIVE_CATEGORIES = ['형성평가', '내신준비평가'];

/** 형성평가 소분류 */
const FORMATIVE_EXAM_TYPES = ['레벨평가', '과정평가', '단원평가', '내신평가', '임의평가'];

/** 내신준비평가 소분류 */
const MIDTERM_PREP_EXAM_TYPES = [
  '최다빈출', '서술형',
  '강남3구기출(객관식)', '강남3구기출(서술형)',
  '최다오답', '고난이도', '학교기출',
];

/** 과정평가 수준 (3단계) */
const COURSE_EXAM_LEVELS = ['기본', '실력', '심화'];

/** 단원평가 수준 (5단계) */
const UNIT_EXAM_LEVELS = ['개념', '기초', '기본', '실력', '심화'];

/** 내신평가 시험 구분 */
const SCHOOL_EXAM_PERIODS = ['중간고사', '기말고사'];

/**
 * 학교급별 기본 문항수 매핑
 * 키: `${examType}:${schoolLevel}` 형태
 */
const DEFAULT_QUESTION_COUNTS = {
  '레벨평가': { '초등': 25, '중등': 25, '고등': 25 },
  '과정평가': { '초등': 15, '중등': 20, '고등': 25 },
  '단원평가': { '초등': 10, '중등': 15, '고등': 20 },
  '최다빈출': { '초등': 20, '중등': 20, '고등': 20 },
  '서술형': { '초등': 20, '중등': 20, '고등': 20 },
  '강남3구기출(객관식)': { '초등': 25, '중등': 25, '고등': 25 },
  '강남3구기출(서술형)': { '초등': 25, '중등': 25, '고등': 25 },
  '최다오답': { '초등': 15, '중등': 15, '고등': 15 },
  '고난이도': { '초등': 15, '중등': 15, '고등': 15 },
};

/** 요일 (한국어, 월~일) */
const WEEKDAYS_KO = ['월', '화', '수', '목', '금', '토', '일'];

/** 학습 진행 상태 (전체 교재 기준) */
const LEARNING_STATUSES = ['진행중', '보류중', '완료'];

module.exports = {
  LEARNING_TYPE_ORDER,
  SCHOOL_LEVELS,
  TEXTBOOK_LEVELS,
  UNIT_STATUSES,
  ASSESSMENT_TYPES,
  WEEKDAYS_KO,
  STUDENT_STATUSES: ['대기', '재원', '퇴원'],
  LEARNING_STATUSES,
  FORMATIVE_CATEGORIES,
  FORMATIVE_EXAM_TYPES,
  MIDTERM_PREP_EXAM_TYPES,
  COURSE_EXAM_LEVELS,
  UNIT_EXAM_LEVELS,
  SCHOOL_EXAM_PERIODS,
  DEFAULT_QUESTION_COUNTS,
};
