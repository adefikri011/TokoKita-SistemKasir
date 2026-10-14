const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const ProductService = require('../services/product.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await ProductService.findAll(req.query.search || '');
  return sendSuccess(res, 'Daftar barang berhasil dimuat', data);
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await ProductService.findById(req.params.id);
  return sendSuccess(res, 'Barang berhasil dimuat', data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await ProductService.create(req.body);
  return sendSuccess(res, 'Barang berhasil ditambahkan', data, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await ProductService.update(req.params.id, req.body);
  return sendSuccess(res, 'Barang berhasil diperbarui', data);
});

exports.remove = asyncHandler(async (req, res) => {
  await ProductService.remove(req.params.id);
  return sendSuccess(res, 'Barang berhasil dihapus');
});
