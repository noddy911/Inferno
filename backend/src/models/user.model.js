import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['admin', 'designer', 'sales', 'client'], default: 'client' },
    phone: { type: String, trim: true },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    passwordChangedAt: { type: Date },
    // Hashed refresh tokens for rotation + revocation.
    refreshTokens: [
      {
        token: { type: String },
        expiresAt: { type: Date },
      },
    ],
    resetPasswordToken: { type: String },
    resetPasswordExpiresAt: { type: Date },
  },
  { timestamps: true }
);

// Hash password (and stamp passwordChangedAt) on create/update.
// Mongoose 9 awaits async hooks; `next` is no longer passed, so omit it.
userSchema.pre('save', async function hashPassword() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
    this.passwordChangedAt = new Date();
  }
});

/** @param {string} candidate */
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

/** Public, safe-to-return representation of the user. */
userSchema.methods.toAuthJSON = function toAuthJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone ?? null,
    avatar: this.avatar ?? null,
  };
};

/** @param {string} tokenHash @param {Date} expiresAt */
userSchema.methods.addRefreshToken = function addRefreshToken(tokenHash, expiresAt) {
  this.refreshTokens.push({ token: tokenHash, expiresAt });
};

/** @param {string} tokenHash */
userSchema.methods.removeRefreshToken = function removeRefreshToken(tokenHash) {
  this.refreshTokens = this.refreshTokens.filter((entry) => entry.token !== tokenHash);
};

export const User = mongoose.model('User', userSchema);
export default User;
