const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const errorHandler = require("./middleware/errorMiddleware");
const connectDB = require("./config/db");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { 
  cors: { origin: "*" },
});

// ✅ MongoDB connection
connectDB();

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Socket.io events
io.on("connection", (socket) => {
  console.log("🟢 User connected");

  socket.on("ticketPurchased", (data) => {
    console.log("🎟️ Ticket purchased:", data);
    io.emit("updateStats", data); // Broadcast to all clients
  });

  socket.on("ticketScanned", (data) => {
    console.log("✅ Ticket scanned:", data);
    io.emit("updateCheckIn", data); // Notify all clients
  });

  socket.on("disconnect", () => {
    console.log("🔴 User disconnected");
  });
});

// ✅ Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/events", require("./routes/eventRoutes"));
app.use("/api/tickets", require("./routes/ticketRoutes"));
app.use("/api/scan", require("./routes/scanRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/stats", require("./routes/statsRoutes"));
app.use("/api/payment", require("./routes/paymentRoutes"));

// ✅ Default route
app.get("/", (req, res) => res.send("Eventify API is running... 🚀"));

// ✅ Global error handler
app.use(errorHandler);

// ✅ Start server (using `server`, not `app`)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🔥 Server running on port ${PORT}`));
