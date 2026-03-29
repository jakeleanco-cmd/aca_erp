require('dotenv').config(); // 환경 변수 로드
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
    const mongoDb = mongoClient.db(process.env.MONGODB_DB_NAME);
    const mongoCollectionStudents = mongoDb.collection('students');
    const mongoCollectionMonthlyBills = mongoDb.collection('monthlyBills');
    console.log('✅ MongoDB 연결 성공');

    // 3. 기존 데이터 초기화 (drop 대신 deleteMany 사용하여 에러 방지)
    console.log('기존 MongoDB 데이터를 초기화합니다...');
    await mongoCollectionStudents.deleteMany({});
    await mongoCollectionMonthlyBills.deleteMany({});

    // 4. MySQL에서 데이터 조회
    console.log('MySQL에서 데이터를 조회 중입니다...');
    const [studentRows] = await mysqlConnection.execute('SELECT * FROM student');
    const [st_paymentRows] = await mysqlConnection.execute('SELECT * FROM st_payment WHERE flag="1"');

    // 5. 학생 데이터 변환 및 삽입


    if (studentRows.length > 0) {
      const mongoDataStudent = studentRows.map((row) => ({

        name: row.name,
        enrolledAt: row.start_date,
        leftAt: row.end_date,
        lastCounselingAt: row.report_update_date,
        schoolLevel: row.grade,
        monthlyTuition: row.fees,
        cashReceiptPhone: row.receipt_phone,
      }));

      await mongoCollectionStudents.insertMany(mongoDataStudent);
      console.log(`✅ 학생(students) 데이터 ${mongoDataStudent.length}건 마이그레이션 완료`);
    }


    // 6. 결제 데이터 변환 및 삽입
    if (st_paymentRows.length > 0) {
      const mongoDataMonthlyBills = st_paymentRows.map((row) => ({

        yearMonth: row.year + "-" + row.month,
        student: row.st_id,
        amount: row.regular_price,
        paymentMethod: row.pay_type,
        receipt_phone: row.receipt_phone,
        paidAt: row.pay_date,
      }));

      await mongoCollectionMonthlyBills.insertMany(mongoDataMonthlyBills);
      console.log(`✅ 결제(st_payments) 데이터 ${mongoDataMonthlyBills.length}건 마이그레이션 완료`);
    }

    console.log('🎉 모든 데이터 마이그레이션이 성공적으로 완료되었습니다.');

  } catch (error) {
    console.error('❌ 데이터 마이그레이션 중 오류 발생:', error);
  } finally {
    // 7. 연결 안전하게 종료
    if (mysqlConnection) await mysqlConnection.end();
    if (mongoClient) await mongoClient.close();
    console.log('데이터베이스 연결이 종료되었습니다.');
  }
})();