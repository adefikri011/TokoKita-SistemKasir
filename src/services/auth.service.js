const bcrypt = require('bcryptjs');
const db = require('../config/db');
const AppError = require('../utils/AppError');
const { signToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

const toPublicUser = (user) => ({
  id: user.id,
  username: user.username,
  full_name: user.full_name,
  role: user.role
});

class AuthService {
  static async login({ username, password }) {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE username = ? AND is_active = 1',
      [username]
    );

    const user = rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));

    if (!valid) {
      throw new AppError('Username atau password salah', 401);
    }

    const publicUser = toPublicUser(user);
    const token = signToken({
      id: publicUser.id,
      role: publicUser.role,
      name: publicUser.full_name
    });

    return { token, user: publicUser };
  }

  static async getProfile(userId) {
    const [rows] = await db.query(
      'SELECT id, username, full_name, role FROM users WHERE id = ? AND is_active = 1',
      [userId]
    );
    if (!rows.length) throw new AppError('Pengguna tidak ditemukan', 404);
    return rows[0];
  }

  // Dipakai script seeding (database/seed-users.js)
  static async createUser({ username, password, full_name, role }) {
    const [exists] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (exists.length) throw new AppError(`Username "${username}" sudah dipakai`, 409);

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      'INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
      [username, hash, full_name, role]
    );
    return { id: result.insertId, username, full_name, role };
  }
}

module.exports = AuthService;
