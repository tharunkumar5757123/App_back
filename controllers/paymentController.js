// controllers/paymentController.js
require("dotenv").config();
const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const Ticket = require("../models/ticketModel");
const Event = require("../models/eventModel");
const User = require("../models/userModel");
const { sendTicketEmail } = require("./emailController");
const QRCode = require("qrcode");

/* ---------------------------------------------------
 * 1️⃣ Create Payment Intent (Card Payments)
 * --------------------------------------------------- */
const createPaymentIntent = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const user = req.user;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid payment amount" });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "inr",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: user?._id || "guest",
        method: method || "card",
      },
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      message: "✅ Payment Intent created successfully",
    });
  } catch (err) {
    console.error("❌ Stripe create intent error:", err.message);
    res.status(500).json({
      message: "Payment initialization failed",
      error: err.message,
    });
  }
};

/* ---------------------------------------------------
 * 2️⃣ Confirm Payment + Generate Ticket
 * --------------------------------------------------- */
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId, eventId, userId, quantity } = req.body;
    console.log("🧾 Confirming Payment:", { paymentIntentId, eventId, userId, quantity });

    if (!paymentIntentId || !eventId || !userId) {
      return res.status(400).json({ message: "Missing payment details" });
    }

    const confirmedIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (confirmedIntent.status !== "succeeded") {
      return res.status(400).json({ message: "Payment not yet confirmed or failed" });
    }

    const event = await Event.findById(eventId);
    const user = await User.findById(userId);
    if (!event || !user) {
      return res.status(404).json({ message: "Event or user not found" });
    }

    // ✅ Generate QR string & image
    const qrText = `${eventId}-${userId}-${Date.now()}`;
    const qrCodeData = await QRCode.toDataURL(qrText);

    const ticket = await Ticket.create({
      event: eventId,
      user: userId,
      quantity: quantity || 1,
      price: event.price || 0,
      qrCodeData,      // base64 image
      qrCodeString: qrText, // ✅ raw text for scanning
      paymentIntentId,
    });

    event.ticketCount = (event.ticketCount || 0) + (quantity || 1);
    await event.save();

    // ✅ Send ticket email
    if (user.email) {
      await sendTicketEmail(user.email, { ...ticket.toObject(), event });
    }

    res.status(200).json({
      message: "✅ Payment confirmed and ticket generated successfully",
      payment: confirmedIntent,
      ticket,
    });
  } catch (err) {
    console.error("❌ Payment confirm error:", err);
    res.status(500).json({
      message: "Payment confirmation failed",
      error: err.message,
    });
  }
};

/* ---------------------------------------------------
 * 3️⃣ Stripe Checkout (redirect flow)
 * --------------------------------------------------- */
const createCheckoutSession = async (req, res) => {
  try {
    const { cart, userId } = req.body;

    if (!cart || cart.length === 0) {
      return res.status(400).json({ message: "No events selected for payment" });
    }

    const lineItems = cart.map((event) => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: event.title || event.name || "Event Ticket",
          description: event.location || event.category || "Event booking",
          images: event.image ? [event.image] : [],
        },
        unit_amount: Math.round(event.price * 100),
      },
      quantity: event.quantity || 1,
    }));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-failed`,
      metadata: {
        userId,
        eventId: cart[0]._id,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Stripe checkout session error:", err.message);
    res.status(500).json({
      message: "Failed to create Stripe checkout session",
      error: err.message,
    });
  }
};

/* ---------------------------------------------------
 * 4️⃣ Stripe Webhook (optional)
 * --------------------------------------------------- */
const handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    console.log("✅ Stripe webhook: Payment succeeded", session.id);

    try {
      const userId = session.metadata.userId;
      const eventId = session.metadata.eventId;
      const user = await User.findById(userId);
      const eventDoc = await Event.findById(eventId);

      if (user && eventDoc) {
        const qrText = `${eventId}-${userId}-${Date.now()}`;
        const qrCodeData = await QRCode.toDataURL(qrText);

        const ticket = await Ticket.create({
          event: eventId,
          user: userId,
          quantity: 1,
          price: eventDoc.price || 0,
          qrCodeData,
          qrCodeString: qrText, // ✅ raw QR text
        });

        eventDoc.ticketCount = (eventDoc.ticketCount || 0) + 1;
        await eventDoc.save();

        if (user.email) {
          await sendTicketEmail(user.email, { ...ticket.toObject(), event: eventDoc });
        }

        console.log("🎟️ Ticket created via webhook:", ticket._id);
      }
    } catch (err) {
      console.error("❌ Error creating ticket via webhook:", err);
    }
  }

  res.json({ received: true });
};

/* ---------------------------------------------------
 * 5️⃣ Confirm Checkout (manual fallback)
 * --------------------------------------------------- */
const confirmCheckout = async (req, res) => {
  try {
    const { eventId, userId, quantity } = req.body;

    if (!eventId || !userId) {
      return res.status(400).json({ message: "Missing event or user" });
    }

    const event = await Event.findById(eventId);
    const user = await User.findById(userId);

    if (!event || !user) {
      return res.status(404).json({ message: "Event or user not found" });
    }

    const qrText = `${eventId}-${userId}-${Date.now()}`;
    const qrCodeData = await QRCode.toDataURL(qrText);

    const ticket = await Ticket.create({
      event: eventId,
      user: userId,
      quantity: quantity || 1,
      price: event.price || 0,
      qrCodeData,
      qrCodeString: qrText,
    });

    event.ticketCount = (event.ticketCount || 0) + (quantity || 1);
    await event.save();

    if (user.email) {
      await sendTicketEmail(user.email, {
        event,
        quantity: ticket.quantity,
        qrCodeData: ticket.qrCodeData,
      });
    }

    res.status(200).json({
      message: "✅ Ticket created successfully after payment",
      ticket,
    });
  } catch (err) {
    console.error("❌ confirmCheckout error:", err.message);
    res.status(500).json({
      message: "Ticket confirmation failed",
      error: err.message,
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createCheckoutSession,
  handleWebhook,
  confirmCheckout,
};
