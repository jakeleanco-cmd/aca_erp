const express = require('express');
const cors = require('cors');
const { connectDb } = require('./db');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

/**
 * MongoDB 연결을 요청마다 시도하지만, db.js 캐시로 실제 연결은 한 번만 유지된다.
 */
app.use(async (req, res, next) => {
  try {
    await connectDb();
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '데이터베이스 연결에 실패했습니다.' });
  }
});

const path = require('path');
const uploadDir = path.join(__dirname, 'uploads');
app.use('/api/uploads', express.static(uploadDir));


app.use('/api/auth', require('./routes/auth'));
app.use('/api/textbooks', require('./routes/textbooks'));
app.use('/api/class-slots', require('./routes/classSlots'));
app.use('/api/students', require('./routes/students'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/learnings', require('./routes/learnings'));
app.use('/api/assessments', require('./routes/assessments'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/exam-sheets', require('./routes/examSheets'));
app.use('/api/formative-exams', require('./routes/formativeExams'));
app.use('/api/exam-papers', require('./routes/examPapers'));


// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: '서버 오류가 발생했습니다.' });
});

module.exports = app;
