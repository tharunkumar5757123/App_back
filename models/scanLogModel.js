const mongoose = require('mongoose');

const scanLogSchema = new mongoose.Schema({
  ticket:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ScanLog', scanLogSchema);
