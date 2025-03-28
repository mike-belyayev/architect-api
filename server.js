require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Canvas = require('./models/Canvas');

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Connection error:', err));

// Save Canvas Endpoint
app.post('/api/canvas', async (req, res) => {
  try {
    const { email, drawingName, canvasData } = req.body;
    
    const newCanvas = new Canvas({
      email,
      drawingName,
      canvasData
    });

    const savedCanvas = await newCanvas.save();
    res.status(201).json(savedCanvas);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get Canvases by Email
app.get('/api/canvas/:email', async (req, res) => {
  try {
    const canvases = await Canvas.find({ email: req.params.email })
      .sort({ createdAt: -1 })
      .select('drawingName createdAt');
      
    res.json(canvases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get Canvas Data
app.get('/api/canvas/:email/:drawingName', async (req, res) => {
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

const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next();
  } else {
    res.status(500).send('Database connection error');
  }
};

app.get('/', checkDbConnection, (req, res) => {
  res.send('API is running and connected to the database');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;