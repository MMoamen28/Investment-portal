const { DataTypes } = require('sequelize');
const sequelize     = require('../config/sequelize');

const InvestmentRequest = sequelize.define('InvestmentRequest', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  processInstanceId: {
    type:      DataTypes.STRING,
    unique:    true,
    allowNull: false,
  },

  // Nested objects stored as JSONB
  investor:   { type: DataTypes.JSONB, defaultValue: {} },
  company:    { type: DataTypes.JSONB, defaultValue: {} },
  investment: { type: DataTypes.JSONB, defaultValue: {} },

  riskLevel: {
    type:   DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    allowNull: true,
  },
  status: {
    type:         DataTypes.ENUM('IN_PROGRESS', 'APPROVED', 'REJECTED', 'ESCALATED', 'MISSING_DATA'),
    defaultValue: 'IN_PROGRESS',
  },
  currentStage:       { type: DataTypes.STRING,  defaultValue: 'SUBMITTED' },
  approvalsReceived:  { type: DataTypes.INTEGER, defaultValue: 0 },
  approvalsRequired:  { type: DataTypes.INTEGER, defaultValue: 0 },
  rejectionsReceived: { type: DataTypes.INTEGER, defaultValue: 0 },
  slaDeadline:        { type: DataTypes.DATE },
  slaBreached:       { type: DataTypes.BOOLEAN, defaultValue: false },
  retryCount:        { type: DataTypes.INTEGER, defaultValue: 0 },
  retryExhausted:    { type: DataTypes.BOOLEAN, defaultValue: false },

  // JSONB for nested status objects
  verificationStatus: {
    type:         DataTypes.JSONB,
    defaultValue: { nationalId: 'PENDING', taxClearance: 'PENDING' },
  },

  // JSONB arrays
  history:       { type: DataTypes.JSONB, defaultValue: [] },
  notifications: { type: DataTypes.JSONB, defaultValue: [] },
}, {
  tableName:  'investment_requests',
  timestamps: true,
});

module.exports = InvestmentRequest;
