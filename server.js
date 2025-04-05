require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Canvas = require('./models/Canvas');

const app = express();
app.use(express.json());
app.use(cors());

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

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Connection error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.post('/canvas', async (req, res) => {
  try {
    const { email, drawingName, canvasData } = req.body;
    
    // Find existing record or create new one
    const updatedCanvas = await Canvas.findOneAndUpdate(
      { email, drawingName },  // Filter
      { email, drawingName, canvasData },  // Update data
      { 
        upsert: true,  // Create if doesn't exist
        new: true,  // Return updated document
        runValidators: true  // Validate schema on update
      }
    );

    res.status(200).json({
      message: updatedCanvas.isNew ? 'Created new drawing' : 'Updated existing drawing',
      canvas: updatedCanvas
    });
  } catch (error) {
    res.status(400).json({ 
      message: 'Update failed',
      error: error.message 
    });
  }
});

app.get('/canvas/:email', async (req, res) => {
  try {
    const canvases = await Canvas.find({ email: req.params.email })
      .sort({ createdAt: -1 })
      .select('drawingName createdAt');
      
    res.json(canvases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get('/canvas/:email/:drawingName', async (req, res) => {
  try {
    const canvas = await Canvas.findOne({
      email: req.params.email,
      drawingName: req.params.drawingName
    });
    
    if (!canvas) return res.status(404).json({ message: 'Drawing not found' });
    res.json(canvas.canvasData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Hhealth check
app.get('/', (req, res) => {
  res.send(mongoose.connection.readyState === 1 
    ? 'API is Ready'
    : 'Connection pending'
  );
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
