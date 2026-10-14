const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const ReportService = require('../services/report.service');

exports.sales = asyncHandler(async (req, res) => {
  const report = await ReportService.getSalesReport(req.query);
  return sendSuccess(res, 'Laporan berhasil dimuat', report);
});
