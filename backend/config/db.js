const sequelize = require('./sequelize');
const bcrypt    = require('bcrypt');

// Import all models so associations are registered
const User              = require('../models/User');
const InvestmentRequest = require('../models/InvestmentRequest');
const Task              = require('../models/Task');
const AuditLog          = require('../models/AuditLog');

/* ─────────────────────────── Auto-seed ─────────────────────────── */
const seedUsers = async () => {
  try {
    const count = await User.count();
    if (count > 0) return;

    const users = [
      { username: 'investor1', password: 'pass123', role: 'INVESTOR',  email: 'investor@gov.eg',  phone: '01000000001' },
      { username: 'investor2', password: 'pass123', role: 'INVESTOR',  email: 'investor2@gov.eg', phone: '01000000002' },
      { username: 'emp_g1',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_1',  email: 'emp1@gov.eg' },
      { username: 'emp_g2',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_2',  email: 'emp2@gov.eg' },
      { username: 'emp_g3',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_3',  email: 'emp3@gov.eg' },
      { username: 'emp_g4',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_4',  email: 'emp4@gov.eg' },
      { username: 'emp_g5',    password: 'pass123', role: 'EMPLOYEE',  approvalGroup: 'GROUP_5',  email: 'emp5@gov.eg' },
      { username: 'manager1',  password: 'pass123', role: 'MANAGER',   email: 'manager@gov.eg'   },
    ];

    for (const u of users) {
      u.password = await bcrypt.hash(u.password, 10);
      await User.create(u);
      console.log(`[Auto-Seed] Created user: ${u.username} (${u.role})`);
    }
    console.log('✅ Database auto-seeding completed.');
  } catch (err) {
    console.error('❌ Auto-seeding failed:', err.message);
  }
};

/* ─────────────────────────── Connect ─────────────────────────── */
const connectDB = async () => {
  let retries = 10;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('✅ PostgreSQL connected');

      // Sync all models (create tables if not exist)
      await sequelize.sync({ alter: true });
      console.log('✅ Database tables synced');

      await seedUsers();
      return;
    } catch (err) {
      retries--;
      if (retries === 0) {
        console.error('❌ PostgreSQL connection failed after all retries:', err.message);
        throw err;
      }
      console.warn(`⚠️  PostgreSQL not ready, retrying... (${retries} attempts left)`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};

module.exports = { connectDB };
