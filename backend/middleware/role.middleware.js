const roleMiddleware = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'غير مصرح لك بالوصول إلى هذه الصفحة' });
  }
  next();
};

module.exports = roleMiddleware;
