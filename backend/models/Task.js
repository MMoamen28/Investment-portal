const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  taskId:            { type: String, unique: true },
  processInstanceId: String,
  taskName:          String,
  assignedGroup:     String,
  claimedBy:         String,
  status:            { type: String, enum: ['AVAILABLE', 'CLAIMED', 'COMPLETED'], default: 'AVAILABLE' },
  decision:          { type: String, enum: ['APPROVED', 'REJECTED', 'MISSING_DATA'] },
  missingFields:     [String],
  rejectionReason:   String,
  slaDeadline:       Date,
  slaBreached:       { type: Boolean, default: false },
  completedAt:       Date,
}, { timestamps: true });

module.exports = mongoose.model('Task', TaskSchema);
