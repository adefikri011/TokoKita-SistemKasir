const AppError = require('../utils/AppError');

// ============================================================
//  Validasi ringan tanpa library eksternal.
//
//  Contoh pemakaian:
//    validateBody({
//      name:  { type: 'string', required: true, min: 2, label: 'Nama barang' },
//      stock: { type: 'number', required: true, min: 0 },
//      role:  { type: 'enum', values: ['admin', 'kasir'] }
//    })
// ============================================================

const COERCERS = {
  string: (v) => String(v).trim(),
  number: (v) => (v === '' || v === null || v === undefined ? NaN : Number(v)),
  integer: (v) => (v === '' || v === null || v === undefined ? NaN : Math.trunc(Number(v))),
  boolean: (v) => v === true || v === 'true' || v === 1 || v === '1',
  enum: (v) => v
};

const TYPE_LABEL = {
  string: 'teks',
  number: 'angka',
  integer: 'angka bulat',
  boolean: 'boolean',
  enum: 'nilai yang diizinkan'
};

function validateBody(schema) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      const label = rule.label || field;
      const raw = body[field];

      // Nilai kosong
      if (raw === undefined || raw === null || raw === '') {
        if (rule.required) errors.push(`${label} wajib diisi`);
        else if (rule.default !== undefined) body[field] = rule.default;
        continue;
      }

      const coerced = COERCERS[rule.type] ? COERCERS[rule.type](raw) : raw;

      switch (rule.type) {
        case 'string':
        case 'enum':
          if (rule.type === 'enum' && !rule.values.includes(coerced)) {
            errors.push(`${label} harus salah satu dari: ${rule.values.join(', ')}`);
          }
          if (rule.type === 'string' && rule.min && coerced.length < rule.min) {
            errors.push(`${label} minimal ${rule.min} karakter`);
          }
          if (rule.type === 'string' && rule.max && coerced.length > rule.max) {
            errors.push(`${label} maksimal ${rule.max} karakter`);
          }
          break;

        case 'number':
        case 'integer':
          if (Number.isNaN(coerced)) {
            errors.push(`${label} harus berupa ${TYPE_LABEL[rule.type]}`);
          } else {
            if (rule.min !== undefined && coerced < rule.min) {
              errors.push(`${label} minimal ${rule.min}`);
            }
            if (rule.max !== undefined && coerced > rule.max) {
              errors.push(`${label} maksimal ${rule.max}`);
            }
            // Batasi jumlah digit desimal (mis. qty kg maksimal 3 angka di belakang koma)
            if (rule.precision !== undefined && rule.type === 'number') {
              const decimals = (String(coerced).split('.')[1] || '').length;
              if (decimals > rule.precision) {
                errors.push(`${label} maksimal ${rule.precision} angka di belakang koma`);
              }
            }
          }
          break;
      }

      body[field] = coerced;
    }

    if (errors.length) {
      return next(new AppError('Data tidak valid', 422, errors));
    }

    req.body = body;
    return next();
  };
}

// Validasi parameter route (:id) — pastikan angka positif
const validateIdParam = (paramName = 'id') => (req, res, next) => {
  const value = Number(req.params[paramName]);
  if (!Number.isInteger(value) || value <= 0) {
    return next(new AppError(`Parameter ${paramName} tidak valid`, 400));
  }
  req.params[paramName] = value;
  return next();
};

module.exports = { validateBody, validateIdParam };
