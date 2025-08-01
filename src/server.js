import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import portfolioRoutes from './routes/portfolio.js';
import { initializeDataDirectory, resetDataDirectory } from './utils/dataInitializer.js';
import { authenticateToken } from './middleware/auth.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors());
app.use(express.json());

// Login endpoint
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  // In production, use environment variable for password
  const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  if (password === correctPassword) {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Portfolio routes
app.use('/api/portfolio', portfolioRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Development endpoint to reset data (only in development)
if (process.env.NODE_ENV === 'development') {
  app.post('/api/reset-data', authenticateToken, async (req, res) => {
    try {
      await resetDataDirectory();
      res.json({ message: 'Data directory reset successfully' });
    } catch (error) {
      console.error('Error resetting data directory:', error);
      res.status(500).json({ error: 'Error resetting data directory' });
    }
  });
}

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Initialize data directory if it doesn't exist
  try {
    await initializeDataDirectory();
  } catch (error) {
    console.error('Error initializing data directory:', error);
  }
}); 