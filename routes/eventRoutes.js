const express = require("express");
const router = express.Router();

const {
  createEvent,                        
  getAllEvents,
  getEventsByHost,
  getEventById,
  updateEvent,
  deleteEvent,
} = require("../controllers/eventController");

const { protect, authorize } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");


// Public routes
router.get("/", getAllEvents);
router.get("/host/:hostId", getEventsByHost);
router.get("/:id", getEventById);

// Protected routes (host/admin only)
router.post("/", protect, authorize("host", "admin"), upload.single("banner"), createEvent);
router.put("/:id", protect, authorize("host", "admin"), upload.single("banner"), updateEvent);
router.delete("/:id", protect, authorize("host", "admin"), deleteEvent);

module.exports = router;
