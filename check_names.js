const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const ExamPaper = require('./server/models/ExamPaper');

dotenv.config({ path: path.join(__dirname, '.env') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aca_erp');
  const papers = await ExamPaper.find({ 'attachments.filename': { $exists: true } }).limit(50);
  
  for (const p of papers) {
    if (!p.attachments || p.attachments.length === 0) continue;
    
    for (const att of p.attachments) {
      if (att.originalName && att.originalName.includes('\uFFFD')) {
        console.log(`[DB Broken Name]: ${att.originalName} (Title: ${p.title})`);
      } else if (att.originalName) {
        console.log(`[DB OK Name]: ${att.originalName} (Title: ${p.title})`);
      }
    }
  }
  process.exit(0);
}

check();
