import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

/**
 * 안내 메시지 생성 (멀티 템플릿 기반)
 * @param {object} bill 고지 정보
 * @param {object} config { templates: [], bankAccount: "" }
 */
export function generateTuitionMessage(bill, config) {
  const { student, amount, yearMonth } = bill;
  if (!student) return '';

  const templates = config?.templates || [];
  const bankAccount = config?.bankAccount;

  if (templates.length === 0) {
    return '설정 페이지에서 안내 메시지 템플릿을 먼저 설정해주세요.';
  }

  // 1. 학생의 수업 요일 추출 (정렬된 문자열 키로 변환)
  const studentWeekdays = [...new Set((student.classSlotIds || []).map(slot => slot.weekdayIndex))].sort();
  const studentWeekdaysKey = studentWeekdays.join(',');

  // 2. 요일 구성이 정확히 일치하는 템플릿 찾기
  let matchedTemplate = templates.find(t => {
    const tWeekdays = [...(t.weekdays || [])].sort();
    return tWeekdays.join(',') === studentWeekdaysKey;
  });

  // 3. 일치하는 템플릿이 없으면 '기본' 템플릿 사용
  if (!matchedTemplate) {
    matchedTemplate = templates.find(t => t.isDefault) || templates[0];
  }

  const templateContent = matchedTemplate.content;
  const month = dayjs(yearMonth).format('M');

  // 4. 치환자 변경 로직
  // (사용자 요청에 따라 날짜/횟수는 템플릿에 직접 입력된 내용을 사용하므로 자동 계산 제외)
  let result = templateContent;
  const map = {
    '{{name}}': student.name,
    '{{grade}}': student.gradeLabel,
    '{{month}}': month,
    '{{amount}}': Number(amount).toLocaleString(),
    '{{level}}': student.schoolLevel,
    '{{bankAccount}}': bankAccount || '',
  };

  Object.entries(map).forEach(([key, value]) => {
    result = result.split(key).join(value);
  });

  return result;
}
