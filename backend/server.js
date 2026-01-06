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
// MIDDLEWARE
// -------------------------------
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      "https://Goku-cmd-gokul.github.io",
      "https://Goku-cmd-gokul.github.io/car-rental"
    ];

app.use(cors({
  origin: function(origin, callback){
    if(!origin) return callback(null, true); // allow non-browser tools like Postman
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = `CORS policy: This origin (${origin}) is not allowed.`;
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));
app.use(express.json());

// -------------------------------
// MONGODB CONNECTION
// -------------------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

// -------------------------------
// NODEMAILER SETUP
// -------------------------------
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,       // your Gmail address
    pass: process.env.EMAIL_PASS        // Gmail App Password
  }
});

// Verify SMTP connection
transporter.verify((error, success) => {
  if (error) console.error("⚠ SMTP connection failed:", error);
  else console.log("✅ SMTP ready to send messages");
});

// -------------------------------
// DEFAULT ROUTE
// -------------------------------
app.get('/', (req, res) => res.send("🚗 Car Rental Backend is running"));

// -------------------------------
// BOOKING ROUTE
// -------------------------------
app.post('/api/book', async (req, res) => {
  try {
    const { name, email, carModel, phone, pickupDate, returnDate } = req.body;

    // Validation
    if (!name || !email || !carModel || !phone) {
      return res.status(400).json({ message: 'Name, email, car model, and phone are required.' });
    }

    const today = new Date();
    const pickup = pickupDate ? new Date(pickupDate) : today;
    const ret = returnDate ? new Date(returnDate) : new Date(today.getTime() + 24*60*60*1000); // default return = next day

    if (pickup < new Date(today.setHours(0,0,0,0))) {
      return res.status(400).json({ message: "Pickup date cannot be in the past." });
    }
    if (pickup > ret) {
      return res.status(400).json({ message: "Return date must be after pickup date." });
    }

    // Save booking to DB
    const booking = new Booking({ name, email, carModel, phone, pickupDate: pickup, returnDate: ret });
    await booking.save();

    // Send confirmation email
    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Booking Is Confirmed - Go Wheels',
        html: `
          <h2>Booking Confirmed ✅</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Car Model:</strong> ${carModel}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Pickup Date:</strong> ${pickup.toDateString()}</p>
          <p><strong>Return Date:</strong> ${ret.toDateString()}</p>
          <p>Check available cars: <a href="https://Goku-cmd-gokul.github.io/car-rental/car.html" target="_blank">View Cars 🚘</a></p>
          <p>Best Regards,<br><strong>Go Wheels Team</strong></p>
        `
      });
      console.log("📧 Email sent to:", email);
    } catch (err) {
      console.warn("⚠ Email failed:", err.message);
    }

    res.status(200).json({ message: 'Booking confirmed', booking });

  } catch (err) {
    console.error("❌ Booking Error:", err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
  }
});

// -------------------------------
// START SERVER
// -------------------------------
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
