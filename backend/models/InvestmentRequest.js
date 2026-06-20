const mongoose = require('mongoose');

const InvestmentRequestSchema = new mongoose.Schema({
  processInstanceId: { type: String, unique: true },
  investor: {
    fullName:   String,
    nationalId: String,
    email:      String,
    phone:      String,
  },
  company: {
    name:     String,
    type:     { type: String },
    activity: String,
    address:  String,
  },
  investment: {
    amount:   Number,
    type:     { type: String },
    partners: Number,
    notes:    String,
  },
  riskLevel:         { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
  status:            { type: String, enum: ['IN_PROGRESS', 'APPROVED', 'REJECTED', 'ESCALATED', 'MISSING_DATA'], default: 'IN_PROGRESS' },
  currentStage:      { type: String, default: 'SUBMITTED' },
  approvalsReceived: { type: Number, default: 0 },
  approvalsRequired: { type: Number, default: 0 },
  slaDeadline:       Date,
  slaBreached:       { type: Boolean, default: false },
  retryCount:        { type: Number, default: 0 },
  retryExhausted:    { type: Boolean, default: false },
  verificationStatus: {
    nationalId:   { type: String, enum: ['PENDING', 'VERIFIED', 'FAILED'], default: 'PENDING' },
    taxClearance: { type: String, enum: ['PENDING', 'VERIFIED', 'FAILED'], default: 'PENDING' },
  },
  history: [{
    stage:     String,
    timestamp: Date,
    note:      String,
    actor:     String,
  }],
  notifications: [{
    type:    { type: String },
    channel: String,
    sentAt:  Date,
    status:  String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('InvestmentRequest', InvestmentRequestSchema);
