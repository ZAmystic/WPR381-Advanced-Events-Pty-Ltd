const express  = require("express");
const router   = express.Router();
const bookings = require("../controllers/bookingController");
const { requireAuth } = require("../middleware/auth");

router.post("/events/:id/book",      requireAuth, bookings.createBooking);


router.post("/bookings/:id/cancel",  requireAuth, bookings.cancelBooking);

module.exports = router;
