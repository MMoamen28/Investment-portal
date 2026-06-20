const mongoose = require('mongoose');

const seedUsers = async () => {
  try {
    const User = require('../models/User');
    const bcrypt = require('bcrypt');
    const count = await User.countDocuments();
    if (count === 0) {
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
      for (const u of users) {
        const hashed = await bcrypt.hash(u.password, 10);
        await User.create({ ...u, password: hashed });
        console.log(`[Auto-Seed] Created user: ${u.username} (${u.role})`);
      }
      console.log('✅ Database auto-seeding completed.');
    }
  } catch (err) {
    console.error('❌ Auto-seeding failed:', err.message);
  }
};

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/investment_portal';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected:', uri);
    await seedUsers();
  } catch (err) {
    console.warn('⚠️  Local MongoDB connection failed. Starting in-memory database fallback...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      const mongoServer = await MongoMemoryServer.create();
      const memUri = mongoServer.getUri();
      await mongoose.connect(memUri);
      console.log('✅ Connected to in-memory MongoDB database:', memUri);
      global.mongoServer = mongoServer; // Keep alive reference
      await seedUsers();
    } catch (fallbackErr) {
      console.error('❌ In-memory MongoDB failed to start:', fallbackErr.message);
      throw err; // throw original connection error
    }
  }
};

module.exports = { connectDB };
