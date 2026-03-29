const mongoose = require('mongoose');
const { WEEKDAYS_KO } = require('../constants');

const classSlotSchema = new mongoose.Schema(
  {
    /** 0~6 인덱스로 WEEKDAYS_KO[weekdayIndex] 와 매칭 */
    weekdayIndex: { type: Number, required: true, min: 0, max: 6 },
    /** "16:00" 형식 — 2시간 수업은 UI/문서에서 고정 규칙으로 안내 */
    startTime: { type: String, required: true, trim: true },
    /** 목록·대시보드 표시용 (예: 월·금 16시) */
    label: { type: String, trim: true },
  },
  { timestamps: true }
);

classSlotSchema.index({ weekdayIndex: 1, startTime: 1 }, { unique: true });

classSlotSchema.virtual('weekdayKo').get(function getWeekdayKo() {
  return WEEKDAYS_KO[this.weekdayIndex] || '';
});

module.exports =
  mongoose.models.ClassSlot || mongoose.model('ClassSlot', classSlotSchema);
