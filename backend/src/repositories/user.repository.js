import { User } from '../models/user.model.js';

/**
 * Database access for users. No business logic here.
 */
export const UserRepository = {
  /** @param {object} data */
  create(data) {
    return User.create(data);
  },

  /** @param {string} id */
  findById(id) {
    return User.findById(id);
  },

  /** @param {string} email */
  findByEmail(email) {
    return User.findOne({ email });
  },

  /** Fetch a user including the hashed password (auth flows only). */
  findByEmailWithPassword(email) {
    return User.findOne({ email }).select('+password');
  },

  /** Fetch a user by a stored refresh-token hash. */
  findByRefreshTokenHash(tokenHash) {
    return User.findOne({ 'refreshTokens.token': tokenHash });
  },

  /** Fetch a user by a hashed password-reset token. */
  findByResetToken(tokenHash) {
    return User.findOne({ resetPasswordToken: tokenHash });
  },

  /** @param {import('mongoose').HydratedDocument} user */
  save(user) {
    return user.save();
  },
};

export default UserRepository;
