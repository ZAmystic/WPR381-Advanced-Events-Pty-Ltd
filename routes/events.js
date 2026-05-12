const express  = require("express");
const router   = express.Router();
const events   = require("../controllers/eventController");
const { requireAdmin } = require("../middleware/auth");

// Public
router.get("/:id", events.getEventDetails);

// Admin only
router.get("/admin/events",            requireAdmin, events.adminListEvents);
router.get("/admin/events/create",     requireAdmin, events.showCreateForm);
router.post("/admin/events/create",    requireAdmin, events.createEvent);
router.get("/admin/events/:id/edit",   requireAdmin, events.showEditForm);
router.post("/admin/events/:id/edit",  requireAdmin, events.updateEvent);
router.post("/admin/events/:id/delete",requireAdmin, events.deleteEvent);

module.exports = router;
