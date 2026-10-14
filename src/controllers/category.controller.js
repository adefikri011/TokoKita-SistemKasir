const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const CategoryService = require('../services/category.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await CategoryService.findAll(req.query.search || '');
  return sendSuccess(res, 'Daftar kategori berhasil dimuat', data);
});

exports.getById = asyncHandler(async (req, res) => {
  const data = await CategoryService.findById(req.params.id);
  return sendSuccess(res, 'Kategori berhasil dimuat', data);
});

exports.create = asyncHandler(async (req, res) => {
  const data = await CategoryService.create(req.body);
  return sendSuccess(res, 'Kategori berhasil ditambahkan', data, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const data = await CategoryService.update(req.params.id, req.body);
  return sendSuccess(res, 'Kategori berhasil diperbarui', data);
});

exports.remove = asyncHandler(async (req, res) => {
  await CategoryService.remove(req.params.id);
  return sendSuccess(res, 'Kategori berhasil dihapus');
});
