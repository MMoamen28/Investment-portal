require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const User     = require('../models/User');
const { connectDB } = require('../config/db');

const users = [
  { username: 'investor1', password: 'pass123', role: 'INVESTOR',  email: 'investor@gov.eg', phone: '01000000001' },
  { username: 'investor2', password: 'pass123', role: 'INVESTOR',  email: 'investor2@gov.eg', phone: '01000000002' },
  { username: 'emp_g1',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_1', email: 'emp1@gov.eg' },
  { username: 'emp_g2',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_2', email: 'emp2@gov.eg' },
  { username: 'emp_g3',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_3', email: 'emp3@gov.eg' },
  { username: 'emp_g4',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_4', email: 'emp4@gov.eg' },
  { username: 'emp_g5',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_5', email: 'emp5@gov.eg' },
  { username: 'manager1',  password: 'pass123', role: 'MANAGER',   email: 'manager@gov.eg'  },
];

(async () => {
  await connectDB();
  await User.deleteMany({});
  for (const u of users) {
    u.password = await bcrypt.hash(u.password, 10);
    await User.create(u);
    console.log(`Created user: ${u.username} (${u.role})`);
  }
  console.log('\n✅ Seed complete. Credentials: username / pass123');
  await mongoose.disconnect();
})();
