const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'لم يتم توفير رمز المصادقة' });

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'investment_portal_secret_2024_egyGov');
    next();
  } catch {
    res.status(401).json({ message: 'رمز المصادقة غير صالح' });
  }
};

module.exports = authMiddleware;
