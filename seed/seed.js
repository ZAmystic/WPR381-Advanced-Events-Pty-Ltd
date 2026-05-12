/**
 * Seed Script
 * Populates the database with realistic sample data.
 *
 * Usage:
 *   node seed/seed.js           — import data
 *   node seed/seed.js --delete  — wipe all collections
 */

require("dotenv").config();
const mongoose = require("mongoose");
const { User, Event, Booking, Review, ContactMessage } = require("../models");

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/advanced_events";

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleUsers = [
  {
    name: "Admin User",
    email: "admin@eventhub.co.za",
    password: "Admin@123",
    role: "admin",
  },
  {
    name: "Thabo Nkosi",
    email: "thabo@example.co.za",
    password: "Password123",
    role: "user",
  },
  {
    name: "Ayanda Dlamini",
    email: "ayanda@example.co.za",
    password: "Password123",
    role: "user",
  },
  {
    name: "Sipho Molefe",
    email: "sipho@example.co.za",
    password: "Password123",
    role: "user",
  },
];

const buildSampleEvents = (adminId) => [
  {
    title: "Tech Conference 2026",
    description:
      "Join industry leaders and innovators for a full day of talks, workshops, and networking opportunities. Covering AI, cloud computing, cybersecurity, and the future of work.",
    category: "Conference",
    date: new Date("2026-07-20T09:00:00"),
    endDate: new Date("2026-07-20T18:00:00"),
    venue: {
      name: "Cape Town Convention Centre",
      address: "1 Lower Long Street",
      city: "Cape Town",
      province: "Western Cape",
    },
    price: 450,
    capacity: 500,
    status: "published",
    isFeatured: true,
    tags: ["technology", "AI", "networking", "innovation"],
    createdBy: adminId,
    imageUrl: "https://picsum.photos/800/400?random=1",
  },
  {
    title: "Joburg Music Festival",
    description:
      "Three stages, twenty artists, one epic weekend. Experience the best of South African music alongside international headliners. Food stalls, art installations, and more.",
    category: "Festival",
    date: new Date("2026-06-12T14:00:00"),
    endDate: new Date("2026-06-14T23:00:00"),
    venue: {
      name: "Ellis Park Stadium",
      address: "Doornfontein",
      city: "Johannesburg",
      province: "Gauteng",
    },
    price: 650,
    capacity: 2000,
    status: "published",
    isFeatured: true,
    tags: ["music", "festival", "arts", "entertainment"],
    createdBy: adminId,
    imageUrl: "https://picsum.photos/800/400?random=2",
  },
  {
    title: "Business Growth Workshop",
    description:
      "A hands-on one-day workshop for entrepreneurs and SME owners. Topics include financial planning, digital marketing, and scaling your business in the South African market.",
    category: "Workshop",
    date: new Date("2026-08-05T08:30:00"),
    endDate: new Date("2026-08-05T17:00:00"),
    venue: {
      name: "Sandton Convention Centre",
      address: "161 Maude Street",
      city: "Sandton",
      province: "Gauteng",
    },
    price: 299,
    capacity: 150,
    status: "published",
    isFeatured: false,
    tags: ["business", "entrepreneurship", "workshop", "SME"],
    createdBy: adminId,
    imageUrl: "https://picsum.photos/800/400?random=3",
  },
  {
    title: "Durban Food & Culture Expo",
    description:
      "Celebrate the rich culinary diversity of KwaZulu-Natal. Over 50 food vendors, live cooking demonstrations, cultural performances, and craft markets.",
    category: "Exhibition",
    date: new Date("2026-09-15T10:00:00"),
    endDate: new Date("2026-09-17T20:00:00"),
    venue: {
      name: "Inkosi Albert Luthuli ICC",
      address: "45 Bram Fischer Road",
      city: "Durban",
      province: "KwaZulu-Natal",
    },
    price: 120,
    capacity: 5000,
    status: "published",
    isFeatured: true,
    tags: ["food", "culture", "Durban", "expo", "family"],
    createdBy: adminId,
    imageUrl: "https://picsum.photos/800/400?random=4",
  },
  {
    title: "Startup Networking Night",
    description:
      "Connect with founders, investors, and mentors in an informal evening setting. Speed networking, lightning pitches, and open bar from 18:00.",
    category: "Networking",
    date: new Date("2026-07-03T18:00:00"),
    endDate: new Date("2026-07-03T22:00:00"),
    venue: {
      name: "Workshop17",
      address: "Watershed, V&A Waterfront",
      city: "Cape Town",
      province: "Western Cape",
    },
    price: 80,
    capacity: 200,
    status: "published",
    isFeatured: false,
    tags: ["startup", "networking", "investment", "tech"],
    createdBy: adminId,
    imageUrl: "https://picsum.photos/800/400?random=5",
  },
];

const buildSampleMessages = () => [
  {
    name: "Nomsa Zulu",
    email: "nomsa@example.co.za",
    message:
      "Hi! I would love to know if group discounts are available for the Tech Conference 2026? We have a team of 8 people.",
  },
  {
    name: "Ruan Pretorius",
    email: "ruan.p@example.co.za",
    message:
      "Is there a student discount for the Business Growth Workshop? I am a final-year BCom student.",
  },
];

// ─── Seed function ────────────────────────────────────────────────────────────
const importData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB Connected");

    // Clear all collections
    await Promise.all([
      User.deleteMany(),
      Event.deleteMany(),
      Booking.deleteMany(),
      Review.deleteMany(),
      ContactMessage.deleteMany(),
    ]);
    console.log("🗑️  Collections cleared");

    // Create users (password hashing handled by pre-save hook)
    const createdUsers = await User.insertMany(
      sampleUsers.map((u) => ({ ...u }))
    );

    // Re-fetch with hashed passwords (insertMany bypasses pre-save hooks in older Mongoose)
    const admin = await User.create({
      ...sampleUsers[0],
      email: "admin@eventhub.co.za",
    }).catch(() => User.findOne({ email: "admin@eventhub.co.za" }));

    const regularUsers = await Promise.all(
      sampleUsers.slice(1).map((u) =>
        User.findOne({ email: u.email })
      )
    );

    const adminUser = await User.findOne({ role: "admin" });
    const events = await Event.insertMany(buildSampleEvents(adminUser._id));
    console.log(`✅ ${events.length} events seeded`);

    // Create a few sample bookings
    const bookings = await Booking.create([
      {
        user: regularUsers[0]._id,
        event: events[0]._id,
        ticketCount: 2,
        totalPrice: events[0].price * 2,
        status: "confirmed",
        eventSnapshot: {
          title: events[0].title,
          date: events[0].date,
          venueName: events[0].venue.name,
          price: events[0].price,
        },
      },
      {
        user: regularUsers[1]._id,
        event: events[1]._id,
        ticketCount: 1,
        totalPrice: events[1].price,
        status: "confirmed",
        eventSnapshot: {
          title: events[1].title,
          date: events[1].date,
          venueName: events[1].venue.name,
          price: events[1].price,
        },
      },
      {
        user: regularUsers[2]._id,
        event: events[0]._id,
        ticketCount: 1,
        totalPrice: events[0].price,
        status: "confirmed",
        eventSnapshot: {
          title: events[0].title,
          date: events[0].date,
          venueName: events[0].venue.name,
          price: events[0].price,
        },
      },
    ]);

    // Update bookedCount on events
    await Event.findByIdAndUpdate(events[0]._id, { bookedCount: 3 });
    await Event.findByIdAndUpdate(events[1]._id, { bookedCount: 1 });
    console.log(`✅ ${bookings.length} bookings seeded`);

    await ContactMessage.insertMany(buildSampleMessages());
    console.log("✅ Contact messages seeded");

    console.log("\n🎉 Database seeded successfully!");
    console.log("──────────────────────────────────");
    console.log("Admin login:   admin@eventhub.co.za  /  Admin@123");
    console.log("User login:    thabo@example.co.za   /  Password123");
    console.log("──────────────────────────────────\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

// ─── Delete all data ──────────────────────────────────────────────────────────
const deleteData = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    await Promise.all([
      User.deleteMany(),
      Event.deleteMany(),
      Booking.deleteMany(),
      Review.deleteMany(),
      ContactMessage.deleteMany(),
    ]);
    console.log("🗑️  All data deleted.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Delete failed:", err.message);
    process.exit(1);
  }
};

process.argv[2] === "--delete" ? deleteData() : importData();
