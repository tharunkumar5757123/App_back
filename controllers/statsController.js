const Event = require('../models/eventModel');
const Ticket = require('../models/ticketModel');
const ScanLog = require('../models/scanLogModel');
// const { getEventStats } = require('./adminController');

// ✅ Event Analytics
const getEventStats = async (req, res) => {
  try {
    const events = await Event.find({ host: req.user._id });
    const stats = [];

    for (let event of events) {
      const totalTickets = await Ticket.countDocuments({ event: event._id });
      const scannedTickets = await Ticket.countDocuments({ event: event._id, isScanned: true });

      stats.push({
        eventId: event._id,
        title: event.title,
        totalTickets,
        scannedTickets
      });
    }
    res.json({ stats });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stats", error: err.message });
  }
};

module.exports={
  getEventStats
}