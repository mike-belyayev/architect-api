require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Canvas = require('./models/Canvas');

const app = express();
app.use(express.json());
app.use(cors());

// ================== NEW CONNECTION HANDLING ==================
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      bufferCommands: false
    }).then(mongoose => mongoose);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Initialize connection on startup
connectDB().catch(err => console.error('Initial connection error:', err));

// Connection health check
setInterval(() => {
  if (mongoose.connection.readyState !== 1) {
    console.log('Reconnecting...');
    connectDB().catch(console.error);
  }
}, 45000); // 45-second ping (under Vercel's 60s timeout)
// ==============================================================

// ================== UPDATED MIDDLEWARE ==================
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});
// ========================================================

// Existing endpoints remain the same (no changes needed below)
app.post('/canvas', async (req, res) => { /* ... */ });
app.get('/canvas/:email', async (req, res) => { /* ... */ });
app.get('/canvas/:email/:drawingName', async (req, res) => { /* ... */ });

// Simplified health check
app.get('/', (req, res) => {
  res.send(mongoose.connection.readyState === 1 
    ? 'API connected to MongoDB'
    : 'Connection pending'
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
