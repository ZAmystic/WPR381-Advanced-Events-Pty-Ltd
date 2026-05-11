require("dotenv").config();
const express = require("express");
const path    = require("path");
const session = require("express-session");
const bcrypt  = require("bcryptjs");
const db      = require("./database/db");

const app = express();

// ── View engine ───────────────────────────────────────────────
app.set("view engine", "ejs");

// ── Middleware ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, "public")));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret",
  resave: false,
  saveUninitialized: false,
}));

// Make session user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

// ── Auth helpers ──────────────────────────────────────────────
function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect("/login");
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).send("Forbidden");
  }
  next();
}

// ── Public routes ─────────────────────────────────────────────

// Home — list all upcoming events
app.get("/", async (req, res) => {
  const [events] = await db.query(
    "SELECT * FROM events WHERE date >= CURDATE() ORDER BY date ASC"
  );
  res.render("index", { events });
});

// Event detail
app.get("/events/:id", async (req, res) => {
  const [[event]] = await db.query("SELECT * FROM events WHERE id = ?", [req.params.id]);
  if (!event) return res.status(404).render("404");
  res.render("event-details", { event });
});

// ── Auth routes ───────────────────────────────────────────────

app.get("/login", (req, res) => res.render("login", { error: null }));

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const [[user]] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.render("login", { error: "Invalid email or password." });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect(user.role === "admin" ? "/admin/events" : "/dashboard");
});

app.get("/register", (req, res) => res.render("register", { error: null }));

app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  const [[existing]] = await db.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return res.render("register", { error: "Email already registered." });
  const hash = await bcrypt.hash(password, 10);
  await db.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hash]);
  res.redirect("/login");
});

app.get("/logout", (req, res) => { req.session.destroy(); res.redirect("/"); });

// ── Contact ───────────────────────────────────────────────────

app.get("/contact", (req, res) => res.render("contact"));

app.post("/contact", async (req, res) => {
  const { name, email, message } = req.body;
  await db.query("INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)", [name, email, message]);
  res.redirect("/");
});

// ── User dashboard ────────────────────────────────────────────

app.get("/dashboard", requireLogin, async (req, res) => {
  const [bookings] = await db.query(
    `SELECT b.id, b.status, b.booked_at, e.title, e.date, e.venue
     FROM bookings b JOIN events e ON e.id = b.event_id
     WHERE b.user_id = ? ORDER BY e.date ASC`,
    [req.session.user.id]
  );
  res.render("dashboard", { bookings });
});

app.post("/events/:id/book", requireLogin, async (req, res) => {
  const eventId = req.params.id;
  const userId  = req.session.user.id;
  const [[event]] = await db.query("SELECT capacity, tickets_sold FROM events WHERE id = ?", [eventId]);
  if (!event || event.tickets_sold >= event.capacity) return res.send("Sorry, this event is fully booked.");
  await db.query("INSERT IGNORE INTO bookings (user_id, event_id, status) VALUES (?, ?, 'confirmed')", [userId, eventId]);
  await db.query("UPDATE events SET tickets_sold = tickets_sold + 1 WHERE id = ? AND tickets_sold < capacity", [eventId]);
  res.redirect("/dashboard");
});

// ── Admin routes ──────────────────────────────────────────────

app.get("/admin/events", requireAdmin, async (req, res) => {
  const [events] = await db.query("SELECT * FROM events ORDER BY date ASC");
  res.render("admin-events", { events });
});

app.get("/admin/events/create", requireAdmin, (req, res) => res.render("event-form", { event: null }));

app.post("/admin/events/create", requireAdmin, async (req, res) => {
  const { title, description, date, venue, price, capacity, category } = req.body;
  await db.query(
    "INSERT INTO events (title, description, date, venue, price, capacity, category, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [title, description, date, venue, price, capacity, category, req.session.user.id]
  );
  res.redirect("/admin/events");
});

app.get("/admin/events/:id/edit", requireAdmin, async (req, res) => {
  const [[event]] = await db.query("SELECT * FROM events WHERE id = ?", [req.params.id]);
  if (!event) return res.status(404).render("404");
  res.render("event-form", { event });
});

app.post("/admin/events/:id/edit", requireAdmin, async (req, res) => {
  const { title, description, date, venue, price, capacity, category } = req.body;
  await db.query(
    "UPDATE events SET title=?, description=?, date=?, venue=?, price=?, capacity=?, category=?, updated_at=NOW() WHERE id=?",
    [title, description, date, venue, price, capacity, category, req.params.id]
  );
  res.redirect("/admin/events");
});

app.post("/admin/events/:id/delete", requireAdmin, async (req, res) => {
  await db.query("DELETE FROM events WHERE id = ?", [req.params.id]);
  res.redirect("/admin/events");
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).render("404"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
