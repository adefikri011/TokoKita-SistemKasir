// Bungkus async handler supaya error langsung diteruskan ke
// errorHandler global — tanpa try/catch berulang di setiap controller.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
