const mongoose = require("mongoose");

/**
 * ContactMessage Schema
 *
 * Stores messages sent via the /contact form.
 * Supports an `isRead` flag for the admin inbox view.
 */
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$/,
        "Please enter a valid email address",
      ],
    },

    message: {
      type: String,
      required: [true, "Message cannot be empty"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters"],
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    // If the sender is a registered user, link them
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
contactMessageSchema.index({ isRead: 1, createdAt: -1 });
contactMessageSchema.index({ email: 1 });

// ─── Static: fetch unread messages ───────────────────────────────────────────
contactMessageSchema.statics.findUnread = function () {
  return this.find({ isRead: false }).sort({ createdAt: -1 });
};

module.exports = mongoose.model("ContactMessage", contactMessageSchema);
