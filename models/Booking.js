const mongoose = require("mongoose");

/**
 * Booking Schema
 *
 * Represents a ticket reservation.
 *
 * Key design decisions:
 *   - `ticketCount` allows multi-ticket purchases (default 1)
 *   - `totalPrice` is stored at booking time to survive price changes
 *   - Status machine: pending → confirmed → cancelled / refunded
 *   - `confirmationCode` is a human-readable unique reference (e.g. "EVH-A3K9P2")
 *   - Atomic capacity check is performed in the controller using
 *     findOneAndUpdate with a conditional filter — this schema stores the result.
 */
const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Booking must belong to a user"],
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Booking must reference an event"],
    },

    ticketCount: {
      type: Number,
      required: [true, "Number of tickets is required"],
      min: [1, "Must book at least 1 ticket"],
      max: [10, "Cannot book more than 10 tickets at once"],
      default: 1,
    },

    totalPrice: {
      type: Number,
      required: [true, "Total price must be recorded"],
      min: [0, "Total price cannot be negative"],
    },

    status: {
      type: String,
      enum: {
        values: ["pending", "confirmed", "cancelled", "refunded"],
        message:
          "Status must be pending, confirmed, cancelled, or refunded",
      },
      default: "pending",
    },

    confirmationCode: {
      type: String,
      unique: true,
      uppercase: true,
      trim: true,
    },

    // Snapshot of event details at booking time (survives event edits)
    eventSnapshot: {
      title: String,
      date: Date,
      venueName: String,
      price: Number,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
bookingSchema.index({ user: 1, event: 1 });
bookingSchema.index({ confirmationCode: 1 }, { unique: true });
bookingSchema.index({ status: 1 });
bookingSchema.index({ createdAt: -1 });

// ─── Prevent duplicate active bookings for the same user/event ────────────────
bookingSchema.index(
  { user: 1, event: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ["pending", "confirmed"] } },
  }
);

// ─── Virtual: isActive ───────────────────────────────────────────────────────
bookingSchema.virtual("isActive").get(function () {
  return ["pending", "confirmed"].includes(this.status);
});

// ─── Pre-save: generate a unique confirmation code ────────────────────────────
bookingSchema.pre("save", function (next) {
  if (this.isNew && !this.confirmationCode) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
    const code = Array.from(
      { length: 6 },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
    this.confirmationCode = `EVH-${code}`;
  }
  next();
});

// ─── Pre-save: stamp cancellation date ───────────────────────────────────────
bookingSchema.pre("save", function (next) {
  if (this.isModified("status") && this.status === "cancelled") {
    this.cancelledAt = new Date();
  }
  next();
});

// ─── Static: bookings for a user ─────────────────────────────────────────────
bookingSchema.statics.findForUser = function (userId) {
  return this.find({ user: userId })
    .populate("event", "title date venue imageUrl status")
    .sort({ createdAt: -1 });
};

// ─── Static: bookings for an event (admin) ───────────────────────────────────
bookingSchema.statics.findForEvent = function (eventId) {
  return this.find({ event: eventId })
    .populate("user", "name email")
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model("Booking", bookingSchema);
