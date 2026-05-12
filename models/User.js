const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 12;

/**
 * User Schema
 *
 * Supports two roles:
 *   - "user"  : can browse events and make bookings
 *   - "admin" : can create, edit and delete events
 *
 * Passwords are hashed with bcrypt before saving.
 * Soft-delete via `isActive` flag (never hard-delete users with bookings).
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please enter a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries unless explicitly asked
    },

    role: {
      type: String,
      enum: {
        values: ["user", "admin"],
        message: "Role must be either 'user' or 'admin'",
      },
      default: "user",
    },

    profileImage: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // adds createdAt & updatedAt automatically
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// ─── Virtual: initials (useful for avatar fallbacks) ─────────────────────────
userSchema.virtual("initials").get(function () {
  return this.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
});

// ─── Virtual: total bookings (populated separately) ──────────────────────────
userSchema.virtual("bookings", {
  ref: "Booking",
  localField: "_id",
  foreignField: "user",
});

// ─── Pre-save: hash password ──────────────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  this.passwordChangedAt = Date.now();
  next();
});

// ─── Instance method: compare passwords ──────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Instance method: did password change after a given timestamp? ────────────
userSchema.methods.changedPasswordAfter = function (timestamp) {
  if (this.passwordChangedAt) {
    const changedAt = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return timestamp < changedAt;
  }
  return false;
};

// ─── Static method: find active users ────────────────────────────────────────
userSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

module.exports = mongoose.model("User", userSchema);
