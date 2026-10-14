const { sendError } = require('../utils/response');

// 404 — route API yang tidak dikenal
const notFound = (req, res, next) => {
  next({
    statusCode: 404,
    message: `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`,
    isOperational: true
  });
};

// Penangan error global — selalu jadi middleware terakhir
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  // Log detail hanya untuk error tak terduga (bug), bukan validasi biasa
  if (!isOperational) {
    console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.stack);
  }

  const message = isOperational
    ? err.message
    : 'Terjadi kesalahan internal pada server';

  return sendError(res, message, err.errors || null, statusCode);
};

module.exports = { notFound, errorHandler };
