const Ticket = require("../models/ticketModel");
const Event = require("../models/eventModel");
const QRCode = require("qrcode");

/**
 * 🎟️ Purchase Ticket (User)
 */
const purchaseTicket = async (req, res) => {
  try {
    const { eventId } = req.body;
    if (!eventId)
      return res.status(400).json({ message: "Event ID is required" });

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Check ticket limit
    const ticketsSold = await Ticket.countDocuments({ event: eventId });
    if (event.ticketLimit && ticketsSold >= event.ticketLimit) {
      return res.status(400).json({ message: "Tickets sold out" });
    }

    // Generate QR code data
    const qrData = `TICKET-${eventId}-${req.user._id}-${Date.now()}`;
    const qrCodeData = await QRCode.toDataURL(qrData);

    // Assign seat number
    const seatNumber = `Seat-${ticketsSold + 1}`;

    const ticket = await Ticket.create({
      event: eventId,
      user: req.user._id,
      qrCodeData,
      seatNumber,
      status: "Active",
      isScanned: false,
    });

    res
      .status(201)
      .json({ message: "Ticket purchased successfully", ticket });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error purchasing ticket", error: err.message });
  }
};

/**
 * 👤 Get My Tickets (User)
 */
const getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ user: req.user._id })
      .populate("event", "title dateTime venue")
      .sort({ createdAt: -1 });

    res.json({ message: "My tickets fetched successfully", tickets });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tickets", error: err.message });
  }
};

/**
 * 🔍 Get Ticket by ID
 */
const getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id).populate(
      "event",
      "title dateTime venue description location"
    );

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Only ticket owner, host, or admin can view
    if (
      ticket.user.toString() !== req.user._id.toString() &&
      !["host", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    res.json({ message: "Ticket fetched successfully", ticket });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching ticket", error: err.message });
  }
};

/**
 * 📷 Scan Ticket (Host/Admin)
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



/**
 * ✏️ Update Ticket (User/Admin)
 */
const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    ticket.attendeeName = req.body.attendeeName || ticket.attendeeName;
    ticket.notes = req.body.notes || ticket.notes;
    ticket.seatNumber = req.body.seatNumber || ticket.seatNumber;

    await ticket.save();
    res.json({ message: "Ticket updated successfully", ticket });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error updating ticket", error: err.message });
  }
};

/**
 * 🧾 Get All Tickets (Admin)
 */
const getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("event", "title dateTime venue")
      .populate("user", "username email");

    res.json({ message: "All tickets fetched successfully", tickets });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching tickets", error: err.message });
  }
};

/**
 * 🗑️ Delete Ticket (User/Admin)
 */
const deleteTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    if (
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await ticket.deleteOne();
    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error deleting ticket", error: err.message });
  }
};

module.exports = {
  purchaseTicket,
  getMyTickets,
  getTicketById,
  scanTicket,
  updateTicket,
  getAllTickets,
  deleteTicket,
};
