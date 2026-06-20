const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username:      { type: String, unique: true },
  password:      String,
  role:          { type: String, enum: ['INVESTOR', 'EMPLOYEE', 'MANAGER'] },
  approvalGroup: String,
  email:         String,
  phone:         String,
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
