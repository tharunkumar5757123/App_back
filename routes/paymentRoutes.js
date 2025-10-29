const express = require("express");
const router = express.Router();
const {
  createPaymentIntent,
  confirmPayment,
  handleWebhook,
  createCheckoutSession,confirmCheckout
} = require("../controllers/paymentController");
const { protect } = require("../middleware/authMiddleware");


router.post("/confirm-checkout", confirmCheckout);
// 💳 Direct (client-side) payments
router.post("/create-intent", protect, createPaymentIntent);
router.post("/confirm", protect, confirmPayment);

// 🚀 Redirect-based Stripe Checkout
router.post("/create-checkout-session", protect, createCheckoutSession);

// 🔔 Stripe Webhook (must be raw body)
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

module.exports = router;
