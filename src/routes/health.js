const express = require('express');
const router = express.Router();

// Health check endpoint for fallback system
router.get('/health', (req, res) => {
  try {
    // Basic health check - you can add more sophisticated checks here
    // such as database connectivity, external service availability, etc.
    
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(healthStatus);
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router; 