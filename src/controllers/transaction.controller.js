const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const TransactionService = require('../services/transaction.service');

exports.list = asyncHandler(async (req, res) => {
  const { status, limit, offset } = req.query;
  const data = await TransactionService.findAll({ status, limit, offset });
  return sendSuccess(res, 'Daftar transaksi berhasil dimuat', data);
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await TransactionService.findById(req.params.id);
  return sendSuccess(res, 'Transaksi berhasil dimuat', data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await TransactionService.createTransaction({
    ...req.body,
    cashier_id: req.user.id,
    cashier_name: req.user.name
  });
  return sendSuccess(res, 'Transaksi berhasil diproses', data, 201);
});

exports.listPending = asyncHandler(async (req, res) => {
  const data = await TransactionService.getPending();
  return sendSuccess(res, 'Daftar transaksi pending berhasil dimuat', data);
});

exports.payPending = asyncHandler(async (req, res) => {
  const data = await TransactionService.payPending(req.params.id, req.body.payment_method);
  return sendSuccess(res, 'Transaksi pending berhasil dilunasi', data);
});

exports.cancelPending = asyncHandler(async (req, res) => {
  const data = await TransactionService.cancelPending(req.params.id);
  return sendSuccess(res, 'Transaksi pending berhasil dibatalkan', data);
});
