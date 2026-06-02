/**
 * server/scripts/importLeanmath.js
 * 
 * leanmath.json 파일에 저장되어 있는 데이터를 읽어서 MongoDB에 마이그레이션 적재하는 스크립트입니다.
 * 중복 저장을 방지하기 위해 실행 시 기존 LeanmathStudent 컬렉션을 깨끗이 비운 후 대량 적재(insertMany)합니다.
 * 
 * 실행 방법: node server/scripts/importLeanmath.js
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// 환경변수(.env) 로드
dotenv.config({ path: path.join(__dirname, '../../.env') });

const LeanmathStudent = require('../models/LeanmathStudent');

async function runMigration() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('오류: MONGODB_URI 환경 변수가 설정되어 있지 않습니다.');
    process.exit(1);
  }

  console.log('MongoDB 연결을 시작합니다...');
  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log('MongoDB 연결 성공!');

  try {
    const jsonPath = path.join(__dirname, '../../leanmath.json');
    if (!fs.existsSync(jsonPath)) {
      throw new Error(`leanmath.json 파일을 찾을 수 없습니다. 경로: ${jsonPath}`);
    }

    console.log('leanmath.json 파일을 읽고 있습니다...');
    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const parsedData = JSON.parse(rawData);

    const students = parsedData.student;
    if (!students || !Array.isArray(students)) {
      throw new Error('json 파일 안에 student 배열이 존재하지 않거나 유효하지 않습니다.');
    }

    console.log(`총 ${students.length}명의 학생 데이터를 파싱했습니다.`);

    // 1. 기존 LeanmathStudent 컬렉션 초기화
    console.log('기존 LeanmathStudent 데이터를 삭제 중입니다...');
    const deleteResult = await LeanmathStudent.deleteMany({});
    console.log(`기존 데이터 삭제 완료: 총 ${deleteResult.deletedCount}개 삭제됨`);

    // 2. 신규 데이터 대량 삽입 (Bulk Insert)
    console.log('새로운 데이터를 MongoDB에 적재하는 중입니다...');
    
    // 깨진 nn, n 기호를 표준 개행 문자(\n)로 정교하게 치환하는 헬퍼 함수
    const cleanBrokenNewlines = (text) => {
      if (!text || typeof text !== 'string') return text;
      
      let cleaned = text;
      
      // 1. 윈도우 스타일 줄바꿈 깨짐인 rn 패턴 복원
      cleaned = cleaned.replace(/\s*rn\s*/g, '\n');
      
      // 2. n- 나 n1단원 같이 마크다운 기호/목차 구분선 앞에 알파벳 n이 붙은 형태 정제
      cleaned = cleaned.replace(/\sn-\s/g, '\n- ');
      cleaned = cleaned.replace(/\sn(\d+)단원/g, '\n$1단원');
      cleaned = cleaned.replace(/\sn(\d+)중단원/g, '\n$1중단원');
      
      // 3. 한글 조사, 동사, 마침표, 마침괄호 뒤에 붙은 깨진 nn, n 기호를 줄바꿈으로 정밀 타격 치환
      //    (영어 단어 내부의 n을 건드리지 않기 위해 정규식 범위 지정)
      cleaned = cleaned.replace(/([.!?\)\dㄱ-ㅎㅏ-ㅣ가-힣])nn(?=[ㄱ-ㅎㅏ-ㅣ가-힣<-\d])/g, '$1\n\n');
      cleaned = cleaned.replace(/([.!?\)\dㄱ-ㅎㅏ-ㅣ가-힣])n(?=[ㄱ-ㅎㅏ-ㅣ가-힣<-\d])/g, '$1\n');
      
      // 4. 앞뒤에 공백이 충분한 독립형 nn, n 처리
      cleaned = cleaned.replace(/\s+nn\s+/g, '\n\n');
      cleaned = cleaned.replace(/\s+n\s+/g, '\n');
      
      // 5. 연속된 여러 줄바꿈 축소 정돈
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
      
      return cleaned.trim();
    };

    // 데이터 전처리: 혹시 누락된 id가 있거나 특수 필드 타입 일관성 보정 및 깨진 개행 정제
    const processedStudents = students.map((s, idx) => {
      const processed = { ...s };
      if (processed.id === undefined || processed.id === null) {
        processed.id = idx + 1;
      }
      
      // 오브젝트의 모든 필드를 순회하며 문자열 값에 대해 깨진 개행 기호 정제 수행
      Object.keys(processed).forEach((key) => {
        if (typeof processed[key] === 'string') {
          processed[key] = cleanBrokenNewlines(processed[key]);
        }
      });

      // 수치형 데이터 변환 및 문자열 트림 처리
      processed.fees = typeof processed.fees === 'number' ? processed.fees : parseInt(processed.fees) || 0;
      processed.discount1 = typeof processed.discount1 === 'number' ? processed.discount1 : parseInt(processed.discount1) || 0;
      processed.discount2 = typeof processed.discount2 === 'number' ? processed.discount2 : parseInt(processed.discount2) || 0;
      
      // 이름이 공백인 경우 예외 처리
      if (!processed.name) {
        processed.name = `임시학생_${processed.id}`;
      }
      
      return processed;
    });

    const insertResult = await LeanmathStudent.insertMany(processedStudents);
    console.log(`데이터 적재 완료! 성공적으로 ${insertResult.length}명의 학생 데이터가 MongoDB에 저장되었습니다.`);

  } catch (error) {
    console.error('데이터 적재 중 오류 발생:', error);
  } finally {
    // 몽고디비 연결 종료
    await mongoose.connection.close();
    console.log('MongoDB 연결이 안전하게 종료되었습니다.');
    process.exit(0);
  }
}

runMigration();
