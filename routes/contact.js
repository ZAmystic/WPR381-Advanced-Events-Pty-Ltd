const express  = require("express");
const router   = express.Router();
const contact  = require("../controllers/contactController");
const { requireAdmin } = require("../middleware/auth");

router.post("/contact",                   contact.submitContact);
router.get("/admin/messages",             requireAdmin, contact.adminListMessages);
router.post("/admin/messages/:id/read",   requireAdmin, contact.markAsRead);

module.exports = router;
