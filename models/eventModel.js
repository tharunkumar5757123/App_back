const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title:       { type: String, required: true },            // Event title
  description: { type: String, default: "" },              // Optional description
  dateTime:    { type: Date, required: true },             // Event date & time
  venue:       { type: String },                           // Optional venue
  location:    { type: String, required: true },           // Location as simple string
  price:       { type: Number, default: 0 },               // Ticket price
  ticketLimit: { type: Number, default: 0 },               // Max tickets
  host:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:   { type: Date, default: Date.now },
  ticketCount: { type: Number, default: 0 },
  coordinates: { type: [Number], default: [] },
  category: { type: String, default: "General" },

  // Cloudinary banner
  banner:   { type: String, default: "" },     // Image URL
  bannerId: { type: String, default: "" },     // Cloudinary public_id (required for delete)
});

module.exports = mongoose.model('Event', eventSchema);
