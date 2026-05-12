const { User } = require("../models");

/**
 * Middleware: protect routes that require a logged-in user.
 */
exports.requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }
  next();
};

/**
 * Middleware: protect routes that require an admin role.
 */
exports.requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.redirect("/login");
  }
  if (req.session.userRole !== "admin") {
    return res.status(403).render("404"); // or a dedicated 403 view
  }
  next();
};

/**
 * Middleware: attach the current user object to res.locals
 * so every EJS template can access `currentUser`.
 */
exports.attachUser = async (req, res, next) => {
  res.locals.currentUser = null;
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId).lean();
      res.locals.currentUser = user;
    } catch (_) {
      // session references a deleted user — clear it
      req.session.destroy();
    }
  }
  next();
};
