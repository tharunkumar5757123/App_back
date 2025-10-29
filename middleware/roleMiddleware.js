// Optional extra middleware for host/admin routes
const hostOnly = (req, res, next) => {
  if (req.user.role !== 'host') {
    return res.status(403).json({ message: 'Only hosts can access this' });
  }
  next();
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can access this' });
  }
  next();
};

module.exports = { hostOnly, adminOnly };
