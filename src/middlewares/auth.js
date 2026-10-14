const { verifyToken } = require('../utils/jwt');
const AppError = require('../utils/AppError');

// Verifikasi token JWT → isi req.user
const requireAuth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new AppError('Akses ditolak, token tidak ditemukan', 401));
  }

  try {
    req.user = verifyToken(token);
    return next();
  } catch (err) {
    return next(err);
  }
};

// Batasi akses berdasarkan role (pakai setelah requireAuth)
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Akses ditolak', 401));
  }
  if (!roles.includes(req.user.role)) {
    return next(new AppError('Anda tidak memiliki akses untuk fitur ini', 403));
  }
  return next();
};

module.exports = { requireAuth, requireRole };
