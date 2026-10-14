const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/response');
const AuthService = require('../services/auth.service');

exports.login = asyncHandler(async (req, res) => {
  const data = await AuthService.login(req.body);
  return sendSuccess(res, 'Login berhasil', data);
});

exports.me = asyncHandler(async (req, res) => {
  const data = await AuthService.getProfile(req.user.id);
  return sendSuccess(res, 'Profil berhasil dimuat', data);
});
