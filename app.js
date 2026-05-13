require("dotenv").config();
const express        = require("express");
const path           = require("path");
const session        = require("express-session");
const MongoStore     = require("connect-mongo");

const connectDB      = require("./config/db");
const { attachUser } = require("./middleware/auth");
const { requireAuth, requireAdmin } = require("./middleware/auth");
const { Event }      = require("./models");
const eventCtrl      = require("./controllers/eventController");
const bookingCtrl    = require("./controllers/bookingController");

// ─── Route modules ────────────────────────────────────────────────────────────
const authRoutes    = require("./routes/auth");
const bookingRoutes = require("./routes/bookings");
const contactRoutes = require("./routes/contact");

const app = express();

// ─── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

// ─── View engine ─────────────────────────────────────────────────────────────
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ─── Session (persisted in MongoDB) ──────────────────────────────────────────
app.use(
  session({
    secret: process.env.SESSION_SECRET || "eventhub_super_secret_change_in_prod",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://vanderbergelcke101_db_user:ElckeEvents@ac-3p7abyr-shard-00-00.eqzwvek.mongodb.net:27017,ac-3p7abyr-shard-00-01.eqzwvek.mongodb.net:27017,ac-3p7abyr-shard-00-02.eqzwvek.mongodb.net:27017/WPR381-Advanced-Events-Pty-Ltd?ssl=true&replicaSet=atlas-h09dg6-shard-0&authSource=admin&appName=Cluster0",
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      maxAge: 14 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  })
);

// ─── Attach current user to every template ───────────────────────────────────
app.use(attachUser);

// ─── Public page routes ───────────────────────────────────────────────────────
app.get("/",         eventCtrl.getHomePage);
app.get("/login",    (req, res) => res.render("login",    { error: null }));
app.get("/register", (req, res) => res.render("register", { error: null }));
app.get("/contact",  (req, res) => res.render("contact",  { error: null, success: null }));
app.get("/events/:id", eventCtrl.getEventDetails);

// ─── Auth protected ───────────────────────────────────────────────────────────
app.get("/dashboard", requireAuth, bookingCtrl.getUserDashboard);

// ─── Admin ────────────────────────────────────────────────────────────────────
app.get("/admin/events",              requireAdmin, eventCtrl.adminListEvents);
app.get("/admin/events/create",       requireAdmin, eventCtrl.showCreateForm);
app.post("/admin/events/create",      requireAdmin, eventCtrl.createEvent);
app.get("/admin/events/:id/edit",     requireAdmin, eventCtrl.showEditForm);
app.post("/admin/events/:id/edit",    requireAdmin, eventCtrl.updateEvent);
app.get("/admin/events/:id/delete",   requireAdmin, eventCtrl.deleteEvent);
app.post("/admin/events/:id/delete",  requireAdmin, eventCtrl.deleteEvent);

// ─── Feature route modules ────────────────────────────────────────────────────
app.use("/", authRoutes);
app.use("/", bookingRoutes);
app.use("/", contactRoutes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).render("404"));

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("💥 Unhandled error:", err);
  res.status(500).render("404");
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 EventHub running → http://localhost:${PORT}`);
});