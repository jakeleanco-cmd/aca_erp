const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // 루트 .env 로드

const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

(async () => {
  let mysqlConnection;
  let mongoClient;

  try {
    console.log('데이터베이스 연결을 시작합니다...');

    // 1. MySQL 연결
    mysqlConnection = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DB,
    });
    console.log('✅ MySQL 연결 성공');

    // 2. MongoDB 연결
    mongoClient = new MongoClient(process.env.MONGODB_URI);
    await mongoClient.connect();
    const mongoDb = mongoClient.db(); // URI에 포함된 DB 사용
    const mongoCollectionStudents = mongoDb.collection('students');
    const mongoCollectionMonthlyBills = mongoDb.collection('monthlyBills');
    console.log('✅ MongoDB 연결 성공');

    // 3. 기존 데이터 초기화 (신중히 사용)
    console.log('기존 MongoDB 데이터를 초기화합니다...');
    await mongoCollectionStudents.deleteMany({});
    await mongoCollectionMonthlyBills.deleteMany({});

    // 4. MySQL에서 데이터 조회
    console.log('MySQL에서 데이터를 조회 중입니다...');
    const [studentRows] = await mysqlConnection.execute('SELECT * FROM student');
    const [st_paymentRows] = await mysqlConnection.execute('SELECT * FROM st_payment WHERE flag="1"');

    // 5. 학생 데이터 변환 및 삽입
    const studentMap = {}; // { mysql_id: mongo_id }
    if (studentRows.length > 0) {
      console.log(`${studentRows.length}명의 학생 데이터를 변환 중...`);
      const mongoDataStudent = studentRows.map((row) => {
        let schoolLevel = '초등';
        const gradeStr = row.grade || '';
        if (gradeStr.includes('중')) schoolLevel = '중등';
        else if (gradeStr.includes('고')) schoolLevel = '고등';

        return {
          // MySQL의 ID를 임시로 들고 있음 (나중에 삭제하거나 무시)
          _mysqlId: row.id,
          name: row.name || '이름없음',
          status: row.status,
          schoolLevel,
          gradeLabel: gradeStr || '-',
          monthlyTuition: Number(row.fees) || 0,
          classSlotIds: [],
          cashReceiptPhone: row.receipt_phone || '',
          enrolledAt: row.start_date ? new Date(row.start_date) : new Date(),
          leftAt: row.end_date ? new Date(row.end_date) : null,
          lastCounselingAt: row.report_update_date ? new Date(row.report_update_date) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      });

      const studentResult = await mongoCollectionStudents.insertMany(mongoDataStudent);
      console.log(`✅ 학생(students) 데이터 ${mongoDataStudent.length}건 마이그레이션 완료`);

      // 매핑 테이블 생성 (MySQL ID -> MongoDB _id)
      const insertedStudents = await mongoCollectionStudents.find({}).toArray();
      insertedStudents.forEach(s => {
        studentMap[s._mysqlId] = s._id;
      });
    }

    // 6. 결제 데이터 변환 및 삽입
    if (st_paymentRows.length > 0) {
      console.log(`${st_paymentRows.length}건의 결제 데이터를 변환 중...`);

      const mongoDataMonthlyBills = st_paymentRows.map((row) => {
        const mongoStudentId = studentMap[row.st_id];

        if (!mongoStudentId) return null; // 학생을 찾을 수 없는 결제 데이터는 제외

        return {
          yearMonth: `${row.year}-${String(row.month).padStart(2, '0')}`,
          student: mongoStudentId,
          amount: Number(row.regular_price) || 0,
          status: '납부완료',
          paymentMethod: row.pay_type || '카드',
          paidAt: row.pay_date ? new Date(row.pay_date) : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }).filter(Boolean); // null 제외

      if (mongoDataMonthlyBills.length > 0) {
        await mongoCollectionMonthlyBills.insertMany(mongoDataMonthlyBills);
        console.log(`✅ 결제(st_payments) 데이터 ${mongoDataMonthlyBills.length}건 마이그레이션 완료 (연동 성공)`);
      }
    }

    console.log('🎉 모든 데이터 마이그레이션이 성공적으로 완료되었습니다.');

  } catch (error) {
    console.error('❌ 데이터 마이그레이션 중 오류 발생:', error);
    if (error.code === 'ECONNREFUSED') {
      console.error('👉 MySQL 서버에 접근할 수 없습니다. 호스트, 포트 및 방화벽 설정을 확인하세요.');
    }
  } finally {
    if (mysqlConnection) await mysqlConnection.end();
    if (mongoClient) await mongoClient.close();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
})();