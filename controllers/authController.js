const { User } = require("../models");

/**
 * Auth Controller
 * Handles user registration, login, and logout.
 * Uses express-session for session-based auth.
 */

// POST /register
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.render("register", { error: "Email is already registered." });
    }

    const user = await User.create({ name, email, password });

    req.session.userId = user._id;
    req.session.userRole = user.role;

    res.redirect("/dashboard");
  } catch (err) {
    // Handle Mongoose validation errors gracefully
    const message =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0].message
        : "Registration failed. Please try again.";
    res.render("register", { error: message });
  }
};

// POST /login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password (field is `select: false` in schema)
    const user = await User.findOne({ email, isActive: true }).select(
      "+password"
    );

    if (!user || !(await user.comparePassword(password))) {
      return res.render("login", { error: "Invalid email or password." });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    req.session.userId = user._id;
    req.session.userRole = user.role;
    req.session.userName = user.name;
    req.session.userEmail = user.email;

    res.redirect("/dashboard");
  } catch (err) {
    res.render("login", { error: "Login failed. Please try again." });
  }
};

// GET /logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
};
