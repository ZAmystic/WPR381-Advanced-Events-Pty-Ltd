const { Event, Booking } = require("../models");

/**
 * Event Controller
 * Public browsing + admin CRUD.
 */

// GET / — homepage: show published events
exports.getHomePage = async (req, res) => {
  try {
    const events = await Event.findPublished().limit(9).lean();
    res.render("index", { events });
  } catch (err) {
    res.render("index", { events: [], error: err.message });
  }
};

// GET /events/:id — single event detail page
exports.getEventDetails = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name")
      .lean();

    if (!event) return res.status(404).render("404");

    res.render("event-details", { event });
  } catch (err) {
    res.status(500).render("404");
  }
};

// GET /admin/events — list all events for admin
exports.adminListEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ createdAt: -1 })
      .populate("createdBy", "name")
      .lean();
    res.render("admin-events", { events });
  } catch (err) {
    res.render("admin-events", { events: [], error: err.message });
  }
};

// GET /admin/events/create — show create form
exports.showCreateForm = (req, res) => {
  res.render("event-form", { event: null, error: null });
};

// POST /admin/events/create — create a new event
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, venueName, venueCity, venueAddress, price, capacity, category, tags } = req.body;

    const event = await Event.create({
      title,
      description,
      date: new Date(date),
      venue: {
        name: venueName,
        address: venueAddress || null,
        city: venueCity || null,
      },
      price: Number(price),
      capacity: Number(capacity),
      category,
      tags: tags ? tags.split(",").map((t) => t.trim()) : [],
      status: "published",
      createdBy: req.session.userId,
    });

    res.redirect("/admin/events");
  } catch (err) {
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0].message
        : "Could not create event.";
    res.render("event-form", { event: null, error: message });
  }
};

// GET /admin/events/:id/edit — show edit form
exports.showEditForm = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).lean();
    if (!event) return res.status(404).render("404");
    res.render("event-form", { event, error: null });
  } catch (err) {
    res.status(500).render("404");
  }
};

// POST /admin/events/:id/edit — update event
exports.updateEvent = async (req, res) => {
  try {
    const { title, description, date, venueName, venueCity, venueAddress, price, capacity, category, status } = req.body;

    const event = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        date: new Date(date),
        "venue.name": venueName,
        "venue.city": venueCity || null,
        "venue.address": venueAddress || null,
        price: Number(price),
        capacity: Number(capacity),
        category,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!event) return res.status(404).render("404");

    res.redirect("/admin/events");
  } catch (err) {
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0].message
        : "Could not update event.";
    const event = await Event.findById(req.params.id).lean();
    res.render("event-form", { event, error: message });
  }
};

// POST /admin/events/:id/delete — soft-cancel or hard delete
exports.deleteEvent = async (req, res) => {
  try {
    // Soft-cancel instead of hard delete to preserve booking history
    await Event.findByIdAndUpdate(req.params.id, { status: "cancelled" });
    res.redirect("/admin/events");
  } catch (err) {
    res.redirect("/admin/events");
  }
};
