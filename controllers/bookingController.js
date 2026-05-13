const mongoose = require("mongoose");
const { Booking, Event } = require("../models");

/**
 * Booking Controller
 *
 * Uses an atomic findOneAndUpdate to increment bookedCount
 * only when availability exists — prevents overbooking under
 * concurrent requests without requiring transactions.
 */

// POST /events/:id/book — create a booking
exports.createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const ticketCount = parseInt(req.body.ticketCount, 10) || 1;
    const userId = req.session.userId;

    // Atomically check capacity and increment bookedCount
    const event = await Event.findOneAndUpdate(
      {
        _id: req.params.id,
        status: "published",
        $expr: { $lte: [{ $add: ["$bookedCount", ticketCount] }, "$capacity"] },
      },
      { $inc: { bookedCount: ticketCount } },
      { new: true, session }
    );

    if (!event) {
      await session.abortTransaction();
      session.endSession();
      return res.redirect(`/events/${req.params.id}?error=sold_out`);
    }

    const booking = await Booking.create(
      [
        {
          user: userId,
          event: event._id,
          ticketCount,
          totalPrice: event.price * ticketCount,
          status: "confirmed",
          eventSnapshot: {
            title: event.title,
            date: event.date,
            venueName: event.venue.name,
            price: event.price,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.redirect(`/dashboard?booking=${booking[0].confirmationCode}`);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    if (err.code === 11000) {
      return res.redirect(`/events/${req.params.id}?error=already_booked`);
    }

    res.redirect(`/events/${req.params.id}?error=booking_failed`);
  }
};

// POST /bookings/:id/cancel — user cancels their own booking
exports.cancelBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.session.userId,
      status: { $in: ["pending", "confirmed"] },
    }).session(session);

    if (!booking) {
      await session.abortTransaction();
      session.endSession();
      return res.redirect("/dashboard?error=not_found");
    }

    booking.status = "cancelled";
    booking.cancelReason = req.body.reason || "Cancelled by user";
    await booking.save({ session });

    await Event.findByIdAndUpdate(
      booking.event,
      { $inc: { bookedCount: -booking.ticketCount } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    res.redirect("/dashboard?cancelled=true");
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.redirect("/dashboard?error=cancel_failed");
  }
};

// GET /dashboard — user's booking history with full stats
exports.getUserDashboard = async (req, res) => {
  try {
    const bookings = await Booking.findForUser(req.session.userId);

    const now = new Date();

    // Separate bookings by status and timing
    const upcomingBookings = bookings.filter(
      (b) => b.isActive && b.event?.date > now
    );
    const pastBookings = bookings.filter(
      (b) => b.isActive && b.event?.date && b.event.date <= now
    );
    const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

    // Total money spent (only on active/confirmed bookings)
    const totalSpent = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

    // Total tickets booked
    const totalTickets = bookings
      .filter((b) => b.status === "confirmed")
      .reduce((sum, b) => sum + (b.ticketCount || 0), 0);

    // Category breakdown for chart data
    const categoryMap = {};
    bookings
      .filter((b) => b.status === "confirmed" && b.event?.category)
      .forEach((b) => {
        const cat = b.event.category;
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });

    // Monthly booking trend (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      const monthLabel = d.toLocaleString("default", { month: "short" });
      const count = bookings.filter((b) => {
        const bd = new Date(b.createdAt);
        return (
          bd.getFullYear() === d.getFullYear() &&
          bd.getMonth() === d.getMonth()
        );
      }).length;
      monthlyData.push({ month: monthLabel, count });
    }

    // Flash messages from query params
    const flash = {};
    if (req.query.booking) flash.booking = req.query.booking;
    if (req.query.cancelled) flash.cancelled = true;
    if (req.query.error) flash.error = req.query.error;

    res.render("dashboard", {
      userName: req.session.userName,
      userEmail: req.session.userEmail || "",
      bookings,
      upcomingBookings,
      pastBookings,
      cancelledBookings,
      totalBookings: bookings.filter((b) => b.status === "confirmed").length,
      upcomingCount: upcomingBookings.length,
      pastCount: pastBookings.length,
      cancelledCount: cancelledBookings.length,
      totalSpent,
      totalTickets,
      categoryData: JSON.stringify(categoryMap),
      monthlyData: JSON.stringify(monthlyData),
      flash,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.render("dashboard", {
      userName: req.session.userName,
      userEmail: req.session.userEmail || "",
      bookings: [],
      upcomingBookings: [],
      pastBookings: [],
      cancelledBookings: [],
      totalBookings: 0,
      upcomingCount: 0,
      pastCount: 0,
      cancelledCount: 0,
      totalSpent: 0,
      totalTickets: 0,
      categoryData: "{}",
      monthlyData: "[]",
      flash: { error: "load_failed" },
    });
  }
};
