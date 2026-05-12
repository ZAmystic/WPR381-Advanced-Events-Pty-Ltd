/**
 * Central export for all Mongoose models.
 * Import from here to keep requires clean:
 *
 *   const { User, Event, Booking } = require("../models");
 */

const User           = require("./User");
const Event          = require("./Event");
const Booking        = require("./Booking");
const Review         = require("./Review");
const ContactMessage = require("./ContactMessage");

module.exports = { User, Event, Booking, Review, ContactMessage };
