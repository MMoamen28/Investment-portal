const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action:            String,
  performedBy:       String,
  processInstanceId: String,
  taskId:            String,
  details:           mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
