// -------------------------------
// IMPORTS & CONFIG
// -------------------------------
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();
const Booking = require('./models/Booking');

const app = express();
const PORT = process.env.PORT || 5000;

// -------------------------------
// ENV CHECK (IMPORTANT)
// -------------------------------
if (!process.env.MONGO_URI || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

// -------------------------------
// CORS SETUP (IMPROVED)
// -------------------------------
const allowedOrigins = [
  "http://127.0.0.1:5500",
  "http://localhost:5500",
  "https://goku-cmd-gokul.github.io"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || origin.includes("github.io")) {
      return callback(null, true);
    }

    console.warn("❌ CORS blocked:", origin);
    return callback(new Error("CORS not allowed"), false);
  },
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

// -------------------------------
// MONGODB CONNECTION (FIXED)
// -------------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => {
    console.error("❌ MongoDB Error:", err.message);
    process.exit(1);
  });

// -------------------------------
// NODEMAILER SETUP (FIXED)
// -------------------------------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify((err) => {
  if (err) console.error("⚠ SMTP Error:", err.message);
  else console.log("✅ SMTP ready");
});

// -------------------------------
// DEFAULT ROUTE
// -------------------------------
app.get('/', (req, res) => {
  res.send("🚗 Car Rental Backend is running");
});

// -------------------------------
// BOOKING ROUTE (FINAL VERSION)
// -------------------------------
app.post('/api/book', async (req, res) => {
  try {
    const { name, email, carModel, phone, pickupDate, returnDate } = req.body;

    // -------------------------------
    // VALIDATION
    // -------------------------------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[0-9]{10}$/;

    if (!name || !email || !carModel || !phone) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ message: "Phone must be 10 digits" });
    }

    // -------------------------------
    // DATE HANDLING
    // -------------------------------
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pickup = pickupDate ? new Date(pickupDate) : new Date(today);
    const ret = returnDate
      ? new Date(returnDate)
      : new Date(pickup.getTime() + 24 * 60 * 60 * 1000);

    if (pickup < today) {
      return res.status(400).json({ message: "Pickup date cannot be in the past" });
    }

    if (pickup > ret) {
      return res.status(400).json({ message: "Return date must be after pickup" });
    }

    // -------------------------------
    // SAVE BOOKING
    // -------------------------------
    const booking = new Booking({
      name,
      email,
      carModel,
      phone,
      pickupDate: pickup,
      returnDate: ret
    });

    await booking.save();

    // -------------------------------
    // EMAIL CONFIRMATION
    // -------------------------------
    try {
      await transporter.sendMail({
        from: `"Go Wheels" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "🚗 Booking Confirmed – Go Wheels",
        html: `
          <h2>Booking Confirmed ✅</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Car:</strong> ${carModel}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Pickup:</strong> ${pickup.toDateString()}</p>
          <p><strong>Return:</strong> ${ret.toDateString()}</p>
          <hr/>
          <a href="https://goku-cmd-gokul.github.io/car-rental/car.html">
            View Cars 🚘
          </a>
          <p>— Go Wheels Team</p>
        `
      });

      console.log("📧 Email sent:", email);

    } catch (mailErr) {
      console.warn("⚠ Email failed:", mailErr.message);
    }

    res.status(200).json({
      message: "Booking confirmed",
      booking
    });

  } catch (err) {
    console.error("❌ Booking Error:", err);
    res.status(500).json({
      message: "Internal server error"
    });
  }
});

// -------------------------------
// START SERVER
// -------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});