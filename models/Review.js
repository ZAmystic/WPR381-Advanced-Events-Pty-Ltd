const mongoose = require("mongoose");

/**
 * Review Schema
 *
 * Users can leave a rating (1-5) + comment after attending an event.
 * One review per user per event (enforced by compound unique index).
 * The Event model's average rating is updated via a post-save static method.
 */
const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review must belong to a user"],
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "Review must reference an event"],
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },

    comment: {
      type: String,
      trim: true,
      minlength: [10, "Comment must be at least 10 characters"],
      maxlength: [1000, "Comment cannot exceed 1000 characters"],
      default: null,
    },

    isApproved: {
      type: Boolean,
      default: true, // set to false if you want admin moderation
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
// One review per user per event
reviewSchema.index({ user: 1, event: 1 }, { unique: true });
reviewSchema.index({ event: 1, isApproved: 1 });
reviewSchema.index({ rating: -1 });

// ─── Static: recalculate average rating on the parent Event ──────────────────
reviewSchema.statics.recalcEventRating = async function (eventId) {
  const stats = await this.aggregate([
    { $match: { event: eventId, isApproved: true } },
    {
      $group: {
        _id: "$event",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const Event = mongoose.model("Event");

  if (stats.length > 0) {
    await Event.findByIdAndUpdate(eventId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await Event.findByIdAndUpdate(eventId, {
      averageRating: 0,
      reviewCount: 0,
    });
  }
};

// ─── Post-save hook: update event rating ─────────────────────────────────────
reviewSchema.post("save", function () {
  this.constructor.recalcEventRating(this.event);
});

// ─── Post-remove hook: update event rating ───────────────────────────────────
reviewSchema.post("findOneAndDelete", function (doc) {
  if (doc) doc.constructor.recalcEventRating(doc.event);
});

module.exports = mongoose.model("Review", reviewSchema);
