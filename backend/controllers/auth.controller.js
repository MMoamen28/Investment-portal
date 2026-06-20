const bcrypt = require('bcrypt');
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');

const register = async (req, res) => {
  try {
    const { username, password, role, email, phone, approvalGroup } = req.body;

    const existing = await User.findOne({ where: { username } });
    if (existing) return res.status(400).json({ message: 'اسم المستخدم موجود بالفعل' });

    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ username, password: hashed, role, email, phone, approvalGroup });

    res.status(201).json({ message: 'تم إنشاء الحساب بنجاح', userId: user.id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: 'بيانات الدخول غير صحيحة' });

    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role, approvalGroup: user.approvalGroup },
      process.env.JWT_SECRET || 'investment_portal_secret_2024_egyGov',
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { username: user.username, role: user.role, email: user.email, approvalGroup: user.approvalGroup },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login };
