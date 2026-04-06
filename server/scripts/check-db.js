const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const ExamPaper = require('../models/ExamPaper');

async function check() {
  await mongoose.connect(process.env.MONGODB_URI);
  const paper = await ExamPaper.findOne({ 'attachments.0': { $exists: true } });
  console.log(JSON.stringify(paper.attachments[0], null, 2));
  await mongoose.disconnect();
}
check();
