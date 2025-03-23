// Backend (Node.js with Express)
const express = require('express');
const Clerk = require('@clerk/clerk-sdk-node').Clerk;
require('dotenv').config();

const app = express();
app.use(express.json()); // To parse JSON request bodies

const clerk = new Clerk(process.env.CLERK_SECRET_KEY);

// Middleware to verify user authentication
const requireAuth = async (req, res, next) => {
    const sessionId = req.headers['authorization']; // Example: Retrieve sessionId from request header
    console.log('sessionId', sessionId)
    if (!sessionId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const verification = await clerk.verifySession(sessionId);
        if (!verification) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        req.auth = verification; // Attach user info to the request
        next();
    } catch (error) {
        console.log('error', error)
        return res.status(401).json({ error: 'Unauthorized' });
    }
  };

// Save canvas route
app.post('/api/save-canvas', requireAuth, async (req, res) => {
  const userId = req.auth.userId; // Extracted from clerk verification

  const canvasData = req.body.canvasData;
  // ... save canvas data to database, associated with userId ...
  res.json({ success: true, message: 'Canvas saved' });
});

// Load canvas route
app.get('/api/load-canvas', requireAuth, async (req, res) => {
  const userId = req.auth.userId; // Extracted from clerk verification

  // ... load canvas data from database, associated with userId ...
  const canvasData = /* ... loaded canvas data ... */;
  res.json({ success: true, canvasData });
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
