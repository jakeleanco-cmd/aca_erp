require('dotenv').config();
const mongoose = require('mongoose');
const Student = require('../models/Student');

async function migrate() {
  try {
    console.log('DB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ DB 연결 성공');

    const students = await Student.find({ status: { $exists: false } });
    console.log(`대상 학생 수: ${students.length}명`);

    let updatedCount = 0;
    for (const student of students) {
      // 퇴원일(leftAt)이 있으면 '퇴원', 없으면 '재원'
      const status = student.leftAt ? '퇴원' : '재원';
      await Student.findByIdAndUpdate(student._id, { $set: { status } });
      updatedCount++;
    }

    console.log(`🎉 마이그레이션 완료! 총 ${updatedCount}명의 상태가 업데이트되었습니다.`);
  } catch (err) {
    console.error('❌ 마이그레이션 실패:', err);
  } finally {
    await mongoose.disconnect();
    console.log('DB 연결 종료.');
  }
}

migrate();
