const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

const SECRET = () => {
  if (!process.env.JWT_SECRET) {
    throw new AppError('JWT_SECRET belum diatur di file .env', 500);
  }
  return process.env.JWT_SECRET;
};

// Token singkat untuk sesi kasir di 1 toko — 12 jam cukup
const EXPIRES_IN = '12h';

const signToken = (payload) =>
  jwt.sign(payload, SECRET(), { expiresIn: EXPIRES_IN });

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET());
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Sesi telah berakhir, silakan masuk kembali', 401);
    }
    throw new AppError('Token tidak valid', 401);
  }
};

module.exports = { signToken, verifyToken };
