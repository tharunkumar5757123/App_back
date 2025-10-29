const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // ✅ Store both the image and the raw string content of the QR
  qrCodeData: { type: String }, // Base64 image data (for PDF/email)
  qrCodeString: { type: String }, // Text encoded inside the QR

  isScanned: { type: Boolean, default: false },
  seatNumber: { type: String, default: "N/A" },
  status: { type: String, default: "Pending" },
  paymentIntentId: { type: String },
  eventDate: { type: Date },
  quantity: { type: Number, default: 1 },
  price: { type: Number, required: true, default: 0 }, // 💰 For revenue tracking
  scannedAt: { type: Date }, // ✅ For tracking scan time

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Ticket", ticketSchema);
