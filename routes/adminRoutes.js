const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getAllEvents,
  getEventStats,
  getDashboardStats,
  getRecentActivities,
  updateUser,
  deleteUser,
} = require("../controllers/adminController");
const { protect, authorize } = require("../middleware/authMiddleware");

// ✅ Protect all admin routes
router.use(protect, authorize("admin"));

// 👇 User Management
router.get("/users", getAllUsers);
router.put("/users/:id", updateUser);
router.delete("/users/:id", deleteUser);

// 👇 Event Management
router.get("/events", getAllEvents);
router.get("/activities", getRecentActivities);

// 👇 Analytics / Stats
router.get("/stats", getDashboardStats); // 👈 This now returns totals
router.get("/event-stats", getEventStats); // 👈 optional: per-event breakdown

module.exports = router;
