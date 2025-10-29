const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

// ====================== SIGNUP ======================
const signup = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    console.log("Incoming signup body:", req.body);

    // 1️⃣ Validate input
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2️⃣ Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 3️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4️⃣ Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role, // can be 'user', 'host', or 'admin'
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    res.status(400).json({
      message: "Signup failed",
      error: err.message,
    });
  }
};

// ====================== LOGIN ======================
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // 2️⃣ Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4️⃣ Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secret123",
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(400).json({
      message: "Login failed",
      error: err.message,
    });
  }
};

// ====================== PROFILE ======================
const getProfile = async (req, res) => {
  try {
    res.json({ message: "User profile fetched successfully", user: req.user });
  } catch (err) {
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
};

// ====================== ADMIN - GET ALL USERS ======================
const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Only admins can access this route" });
    }

    const users = await User.find().select("-password");
    res.json({ message: "All users fetched successfully", users });
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
};

module.exports = {
  signup,
  login,
  getProfile,
  getAllUsers,
};
