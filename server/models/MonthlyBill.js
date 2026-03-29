const mongoose = require('mongoose');

const monthlyBillSchema = new mongoose.Schema(
  {
    /** "2025-03" 형식 */
    yearMonth: { type: String, required: true, trim: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true, min: 0 },
    /** 미납 | 납부완료 */
    status: { type: String, enum: ['미납', '납부완료'], default: '미납' },
    paymentMethod: { type: String, default: null },
    paidAt: { type: Date, default: null },
    receiptIssued: { type: Boolean, default: false },
    receiptIssuedAt: { type: Date, default: null },
    /** 향후 PG/국세청 연동 시 외부 식별자 */
    externalReceiptId: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

monthlyBillSchema.index({ yearMonth: 1, student: 1 }, { unique: true });

module.exports =
  mongoose.models.MonthlyBill || mongoose.model('MonthlyBill', monthlyBillSchema);
