const { ContactMessage } = require("../models");

// POST /contact — save a message from the contact form
exports.submitContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    await ContactMessage.create({
      name,
      email,
      message,
      user: req.session.userId || null,
    });

    res.render("contact", {
      success: "Your message has been sent! We'll be in touch soon.",
      error: null,
    });
  } catch (err) {
    const errorMsg =
      err.name === "ValidationError"
        ? Object.values(err.errors)[0].message
        : "Could not send message. Please try again.";

    res.render("contact", { success: null, error: errorMsg });
  }
};

// GET /admin/messages — admin inbox
exports.adminListMessages = async (req, res) => {
  try {
    const messages = await ContactMessage.find()
      .sort({ createdAt: -1 })
      .populate("user", "name email")
      .lean();

    res.render("admin-messages", { messages });
  } catch (err) {
    res.render("admin-messages", { messages: [], error: err.message });
  }
};

// POST /admin/messages/:id/read — mark as read
exports.markAsRead = async (req, res) => {
  try {
    await ContactMessage.findByIdAndUpdate(req.params.id, { isRead: true });
    res.redirect("/admin/messages");
  } catch (err) {
    res.redirect("/admin/messages");
  }
};
