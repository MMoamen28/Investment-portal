const { DataTypes } = require('sequelize');
const sequelize     = require('../config/sequelize');

const Task = sequelize.define('Task', {
  id: {
    type:         DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey:   true,
  },
  taskId: {
    type:      DataTypes.STRING,
    unique:    true,
    allowNull: false,
  },
  processInstanceId: { type: DataTypes.STRING },
  taskName:          { type: DataTypes.STRING },
  assignedGroup:     { type: DataTypes.STRING },
  claimedBy:         { type: DataTypes.STRING },
  status: {
    type:         DataTypes.ENUM('AVAILABLE', 'CLAIMED', 'COMPLETED'),
    defaultValue: 'AVAILABLE',
  },
  decision: {
    type: DataTypes.ENUM('APPROVED', 'REJECTED', 'MISSING_DATA'),
    allowNull: true,
  },
  missingFields:   { type: DataTypes.ARRAY(DataTypes.TEXT), defaultValue: [] },
  rejectionReason: { type: DataTypes.TEXT },
  slaDeadline:     { type: DataTypes.DATE },
  slaBreached:     { type: DataTypes.BOOLEAN, defaultValue: false },
  completedAt:     { type: DataTypes.DATE },
}, {
  tableName:  'tasks',
  timestamps: true,
});

module.exports = Task;
