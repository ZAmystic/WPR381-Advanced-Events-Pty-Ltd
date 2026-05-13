const mongoose = require("mongoose");

/**
 * Event Schema
 *
 * Covers the full lifecycle of an event:
 *   - draft → published → cancelled / completed
 *
 * Capacity management is handled via a virtual `availableTickets`
 * and the `bookedCount` field (incremented atomically by the
 * Booking controller to avoid race conditions).
 */

// ─── Sub-schema: Venue ────────────────────────────────────────────────────────
const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Venue name is required"],
      trim: true,
    },
    address: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      trim: true,
      default: null,
    },
    province: {
      type: String,
      trim: true,
      default: null,
    },
    country: {
      type: String,
      trim: true,
      default: "South Africa",
    },
  },
  { _id: false } // embedded — no separate _id needed
);

// ─── Main Event Schema ────────────────────────────────────────────────────────
const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Event description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
      maxlength: [5000, "Description cannot exceed 5000 characters"],
    },

    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: [
          "Conference",
          "Festival",
          "Workshop",
          "Concert",
          "Exhibition",
          "Networking",
          "Sports",
          "Other",
        ],
        message: "Please select a valid category",
      },
    },

    date: {
      type: Date,
      required: [true, "Event date is required"],
    },

    endDate: {
      type: Date,
      default: null,
    },

    venue: {
      type: venueSchema,
      required: [true, "Venue details are required"],
    },

    price: {
      type: Number,
      required: [true, "Ticket price is required"],
      min: [0, "Price cannot be negative"],
    },

    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },

    bookedCount: {
      type: Number,
      default: 0,
      min: [0, "Booked count cannot be negative"],
    },

    imageUrl: {
      type: String,
      default: null,
    },

    tags: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: ["draft", "published", "cancelled", "completed"],
        message: "Status must be draft, published, cancelled, or completed",
      },
      default: "draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "An event must have a creator"],
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
eventSchema.index({ slug: 1 }, { unique: true });
eventSchema.index({ date: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ isFeatured: 1, date: 1 });
// Full-text search on title + description
eventSchema.index({ title: "text", description: "text", tags: "text" });

// ─── Virtual: availableTickets ────────────────────────────────────────────────
eventSchema.virtual("availableTickets").get(function () {
  return this.capacity - this.bookedCount;
});

// ─── Virtual: isSoldOut ───────────────────────────────────────────────────────
eventSchema.virtual("isSoldOut").get(function () {
  return this.bookedCount >= this.capacity;
});

// ─── Virtual: percentageFilled ───────────────────────────────────────────────
eventSchema.virtual("percentageFilled").get(function () {
  if (this.capacity === 0) return 0;
  return Math.round((this.bookedCount / this.capacity) * 100);
});

// ─── Virtual: reviews (populated separately) ─────────────────────────────────
eventSchema.virtual("reviews", {
  ref: "Review",
  localField: "_id",
  foreignField: "event",
});

// ─── Pre-save: auto-generate slug from title ──────────────────────────────────
eventSchema.pre("save", function (next) {
  if (this.isModified("title") || this.isNew) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-") +
      "-" +
      Date.now();
  }
  next();
});

// ─── Pre-save: mark as completed if date has passed ──────────────────────────
eventSchema.pre("save", function (next) {
  const now = new Date();
  if (this.date < now && this.status === "published") {
    this.status = "completed";
  }
  next();
});

// ─── Static: published events only ───────────────────────────────────────────
eventSchema.statics.findPublished = function () {
  return this.find({ status: "published" }).sort({ date: 1 });
};

// ─── Static: featured events ─────────────────────────────────────────────────
eventSchema.statics.findFeatured = function (limit = 6) {
  return this.find({ status: "published", isFeatured: true })
    .sort({ date: 1 })
    .limit(limit);
};

// ─── Static: full-text search ────────────────────────────────────────────────
eventSchema.statics.search = function (query) {
  return this.find(
    { $text: { $search: query }, status: "published" },
    { score: { $meta: "textScore" } }
  ).sort({ score: { $meta: "textScore" } });
};

// ─── Instance method: can a user still book? ─────────────────────────────────
eventSchema.methods.hasAvailability = function () {
  return (
    this.status === "published" &&
    this.bookedCount < this.capacity &&
    this.date > new Date()
  );
};


module.exports = mongoose.model("Event", eventSchema);
