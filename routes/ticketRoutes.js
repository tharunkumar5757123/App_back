const express = require("express");
const router = express.Router();
const ticketController = require("../controllers/ticketController");
const { protect, authorize } = require("../middleware/authMiddleware");

// 🔹 Purchase Ticket (User)
router.post("/purchase", protect, authorize("user"), ticketController.purchaseTicket);

// 🔹 Get All Tickets (Admin)
router.get("/admin/all", protect, authorize("admin"), ticketController.getAllTickets);

// 🔹 Get My Tickets (User)
router.get("/my-tickets", protect, authorize("user"), ticketController.getMyTickets);

// 🔹 Get Ticket by ID
router.get("/:id", protect, ticketController.getTicketById);

// 🔹 Update Ticket (User)
router.put("/:id", protect, authorize("user"), ticketController.updateTicket);

// 🔹 Delete Ticket (User or Admin)
router.delete("/:id", protect, authorize("user", "admin"), ticketController.deleteTicket);

// 🔹 Scan Ticket (Host/Admin)
router.post("/scan", protect, authorize("host", "admin"), ticketController.scanTicket);

module.exports = router;
