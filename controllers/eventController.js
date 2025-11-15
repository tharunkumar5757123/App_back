const Event = require("../models/eventModel");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      dateTime,
      venue,
      location,
      price,
      ticketLimit,
      coordinates,
      category,
    } = req.body;

    if (!title || !dateTime || !location) {
      return res.status(400).json({
        message: "Title, date/time, and location are required",
      });
    }

    let bannerUrl = "";
    let bannerId = "";

    if (req.file) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: "eventify_uploads",
        quality: "auto",
        fetch_format: "auto",
      });

      bannerUrl = result.secure_url;
      bannerId = result.public_id;

      fs.unlinkSync(req.file.path);
    }

    const event = new Event({
      title,
      description: description || "",
      dateTime: new Date(dateTime),
      venue: venue || "",
      location,
      price: Number(price) || 0,
      ticketLimit: Number(ticketLimit) || 0,
      coordinates: Array.isArray(coordinates) ? coordinates : [],
      category: category || "General",
      banner: bannerUrl,
      bannerId,
      host: req.user._id,
    });

    const createdEvent = await event.save();
    res.status(201).json({ event: createdEvent });
  } catch (error) {
    console.error("Create Event Error:", error);
    res.status(500).json({
      message: "Server error creating event",
      error: error.message,
    });
  }
};

const getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().populate("host", "username email");
    res.json({ events });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch events",
      error: error.message,
    });
  }
};

const getEventsByHost = async (req, res) => {
  try {
    const events = await Event.find({ host: req.params.hostId }).populate(
      "host",
      "username email"
    );
    res.json({ events });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch host events",
      error: error.message,
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "host",
      "username email"
    );
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ event });
  } catch (error) {
    res.status(400).json({ message: "Invalid ID", error: error.message });
  }
};

const updateEvent = async (req, res) => {
  try {
    let updates = { ...req.body };

    if (req.file) {
      const oldEvent = await Event.findById(req.params.id);
      if (!oldEvent) return res.status(404).json({ message: "Event not found" });

      // Delete old Cloudinary image
      if (oldEvent.bannerId) {
        await cloudinary.uploader.destroy(oldEvent.bannerId);
      }

      // Upload new image
      const newImage = await cloudinary.uploader.upload(req.file.path, {
        folder: "eventify_uploads",
        quality: "auto",
        fetch_format: "auto",
      });

      updates.banner = newImage.secure_url;
      updates.bannerId = newImage.public_id;

      fs.unlinkSync(req.file.path);
    }

    const event = await Event.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({ message: "Event updated", event });
  } catch (error) {
    res.status(400).json({
      message: "Update failed",
      error: error.message,
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });

    // Delete cloudinary image
    if (event.bannerId) {
      await cloudinary.uploader.destroy(event.bannerId);
    }

    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(400).json({
      message: "Delete failed",
      error: error.message,
    });
  }
};

module.exports = {
  createEvent,
  getAllEvents,
  getEventsByHost,
  getEventById,
  updateEvent,
  deleteEvent,
};
