const Booking = require("../models/Booking");

exports.getDashboard = async (
    req,
    res
) => {

    try {

        if (!req.session.user) {

            return res.redirect("/login");
        }

        // Get user's bookings
        const bookings = await Booking.find({

            user: req.session.user._id

        }).populate("event");

        // Total bookings
        const totalBookings =
            bookings.length;

        // Upcoming events
        const upcomingEvents =
            bookings.filter(booking => {

                return (
                    new Date(
                        booking.event.date
                    ) > new Date()
                );

            }).length;

        // Past events
        const pastEvents =
            bookings.filter(booking => {

                return (
                    new Date(
                        booking.event.date
                    ) <= new Date()
                );

            }).length;

        res.render("dashboard", {

            user: req.session.user,

            bookings,

            totalBookings,

            upcomingEvents,

            pastEvents

        });

    } catch (error) {

        console.log(error);

        res.status(500).send(
            "Server Error"
        );
    }
};