const { DataTypes } = require('sequelize');
const sequelize     = require('../config/sequelize');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  action:            { type: DataTypes.STRING },
  performedBy:       { type: DataTypes.STRING },
  processInstanceId: { type: DataTypes.STRING },
  taskId:            { type: DataTypes.STRING },
  details:           { type: DataTypes.JSONB, defaultValue: {} },
}, {
  tableName:  'audit_logs',
  timestamps: true,
});

module.exports = AuditLog;
