const User = require("../models/userModel");
const Event = require("../models/eventModel");
const Ticket = require("../models/ticketModel");
const ScanLog = require("../models/scanLogModel");

// ✅ Get all users (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ message: "All users fetched successfully", users });
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
};

// ✅ Get all events (Admin only)
const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("host", "name email");
    res.json({ message: "All events fetched successfully", events });
  } catch (err) {
    res.status(500).json({ message: "Error fetching events", error: err.message });
  }
};
// ✅ Recent Activities for Dashboard
const getRecentActivities = async (req, res) => {
  try {
    const recentTickets = await Ticket.find()
      .populate("user", "name email")
      .populate("event", "title")
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEvents = await Event.find()
      .populate("host", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    const activities = [
      ...recentTickets.map((t) => ({
        type: "ticket",
        message: `🎟️ ${t.user?.name || "Someone"} booked ${t.quantity} ticket(s) for ${t.event?.title || "an event"}.`,
        time: t.createdAt,
      })),
      ...recentEvents.map((e) => ({
        type: "event",
        message: `🗓️ New event "${e.title}" was created by ${e.host?.name || "a host"}.`,
        time: e.createdAt,
      })),
    ]
      .sort((a, b) => b.time - a.time)
      .slice(0, 8);

    res.json({ message: "Recent activities fetched", activities });
  } catch (err) {
    res.status(500).json({ message: "Error fetching recent activities", error: err.message });
  }
};


// ✅ Admin dashboard stats (Total users, events, tickets, revenue)
// ✅ Admin dashboard stats (Total users, events, tickets, revenue)
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalEvents = await Event.countDocuments();
    const totalTickets = await Ticket.countDocuments();

    // ✅ Calculate total revenue from ticket prices
    const totalRevenueAgg = await Ticket.aggregate([
      { $group: { _id: null, total: { $sum: "$price" } } },
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    res.json({
      message: "Dashboard stats fetched successfully",
      totalUsers,
      totalEvents,
      totalTickets,
      totalRevenue,
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching dashboard stats", error: err.message });
  }
};


// ✅ Per-event stats (optional detailed breakdown)
const getEventStats = async (req, res) => {
  try {
    const events = await Event.find();
    const stats = await Promise.all(
      events.map(async (event) => {
        const ticketsSold = await Ticket.countDocuments({ event: event._id });
        const ticketsScanned = await Ticket.countDocuments({
          event: event._id,
          isScanned: true,
        });
        return {
          eventId: event._id,
          title: event.title,
          ticketsSold,
          ticketsScanned,
        };
      })
    );
    res.json({ message: "Event stats fetched", stats });
  } catch (err) {
    res.status(500).json({ message: "Error fetching event stats", error: err.message });
  }
};

// ✅ Update user role
const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  user.role = req.body.role || user.role;
  const updated = await user.save();
  res.json({ message: "User updated", user: updated });
};

// ✅ Delete user
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    await User.deleteOne({ _id: req.params.id });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user", error: err.message });
  }
};

module.exports = {
  getAllUsers,
  getAllEvents,
  getEventStats,
  getDashboardStats,
  getRecentActivities,
  updateUser,
  deleteUser,
};
