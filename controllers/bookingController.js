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
      return res.redirect(
        `/events/${req.params.id}?error=sold_out`
      );
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

    res.redirect(
      `/dashboard?booking=${booking[0].confirmationCode}`
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    // Duplicate booking (unique index violation)
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

    // Return tickets to the pool
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

// GET /dashboard — user's booking history
exports.getUserDashboard = async (req, res) => {
  try {
    const bookings = await Booking.findForUser(req.session.userId);

    const now = new Date();
    const upcomingBookings = bookings.filter(
      (b) => b.isActive && b.event?.date > now
    );
    const pastBookings = bookings.filter(
      (b) => !b.isActive || (b.event?.date && b.event.date <= now)
    );

    res.render("dashboard", {
      userName: req.session.userName,
      bookings,
      totalBookings: bookings.length,
      upcomingCount: upcomingBookings.length,
      pastCount: pastBookings.length,
      upcomingBookings,
      pastBookings,
    });
  } catch (err) {
    res.render("dashboard", {
      userName: req.session.userName,
      bookings: [],
      totalBookings: 0,
      upcomingCount: 0,
      pastCount: 0,
      upcomingBookings: [],
      pastBookings: [],
      error: err.message,
    });
  }
};
