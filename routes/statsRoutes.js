const express = require('express');
const router = express.Router();
const { getEventStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/authMiddleware');
const Event = require("../models/eventModel");
const Ticket = require("../models/ticketModel");

// ✅ Existing route
router.get('/', protect, authorize('host', 'admin'), getEventStats);

// ✅ Add this new route for host dashboard
router.get('/host', protect, authorize('host'), async (req, res) => {
  try {
    const hostId = req.user._id;
    const events = await Event.find({ host: hostId });
    const totalEvents = events.length;

    const eventIds = events.map((e) => e._id);
    const tickets = await Ticket.find({ event: { $in: eventIds } });

    const totalTickets = tickets.length;
    const totalRevenue = tickets.reduce((sum, t) => sum + (t.amountPaid || 0), 0);
    const avgRevenuePerEvent = totalEvents > 0 ? totalRevenue / totalEvents : 0;

    const now = new Date();
    const upcomingEvents = events
      .filter((e) => new Date(e.dateTime) > now)
      .slice(0, 5);

    res.json({
      totalEvents,
      totalTickets,
      totalRevenue,
      avgRevenuePerEvent,
      upcomingEvents,
    });
  } catch (err) {
    console.error("Error fetching host stats:", err);
    res.status(500).json({ message: "Failed to fetch host stats" });
  }
});

module.exports = router;
