const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const DeviceService = require('../services/device.service');

exports.list = asyncHandler(async (req, res) => {
  const data = await DeviceService.findAll();
  return sendSuccess(res, 'Daftar perangkat berhasil dimuat', data);
});

exports.check = asyncHandler(async (req, res) => {
  const data = await DeviceService.runCheck();
  return sendSuccess(res, 'Pengecekan perangkat selesai', data);
});

exports.findByCode = asyncHandler(async (req, res) => {
  const product = await DeviceService.findByCode(req.query.code || '');
  return sendSuccess(res, 'Lookup barcode selesai', product);
});
