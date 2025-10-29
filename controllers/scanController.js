// controllers/scanTicketController.js
const Ticket = require("../models/ticketModel");
const Event = require("../models/eventModel");
const User = require("../models/userModel");

/**
 * 🎫 Scan Ticket Controller
 * Supports scanning via both:
 * - raw MongoDB ObjectId (_id)
 * - qrCodeString (the text encoded in QR)
 */
const scanTicket = async (req, res) => {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({ message: "Ticket ID is required" });
    }

    console.log("🔍 Raw QR data received:", ticketId);

    // 🔎 Try to find the ticket (by ID or QR string)
    let ticket = null;

    // Check if the ticketId is a valid ObjectId (24-character hex)
    if (/^[0-9a-fA-F]{24}$/.test(ticketId)) {
      ticket = await Ticket.findById(ticketId)
        .populate("event", "title dateTime venue")
        .populate("user", "username email");
    }

    // If not found, try searching by qrCodeString
    if (!ticket) {
      ticket = await Ticket.findOne({ qrCodeString: ticketId })
        .populate("event", "title dateTime venue")
        .populate("user", "username email");
    }

    // ❌ Ticket not found
    if (!ticket) {
      console.log("❌ Ticket not found for:", ticketId);
      return res.status(404).json({ message: "Ticket not found" });
    }

    // ⚠️ Already scanned
    if (ticket.isScanned || ticket.status === "Used") {
      console.log("⚠️ Ticket already scanned:", ticket._id);
      return res.status(400).json({ message: "Ticket already scanned" });
    }

    // ✅ Mark ticket as used
    ticket.isScanned = true;
    ticket.status = "Used";
    ticket.scannedAt = new Date();
    await ticket.save();

    // 🔔 Optional: Notify front-end in real-time (Socket.io)
    const io = req.app.get("io");
    if (io) {
      io.emit("ticketScanned", {
        ticketId: ticket._id,
        eventId: ticket.event._id,
        scannedBy: req.user?._id || "Unknown",
        scannedAt: ticket.scannedAt,
      });
    }

    console.log("✅ Ticket scanned successfully:", ticket._id);

    // ✅ Response for frontend
    res.json({
      message: "✅ Ticket scanned successfully",
      ticket: {
        id: ticket._id,
        status: ticket.status,
        scannedAt: ticket.scannedAt,
        event: ticket.event,
        user: ticket.user,
      },
    });
  } catch (err) {
    console.error("❌ Error scanning ticket:", err.message);
    res.status(500).json({
      message: "Error scanning ticket",
      error: err.message,
    });
  }
};

module.exports = { scanTicket };
