const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const streetRoutes = require('./routes/streets');
const propertyRoutes = require('./routes/properties');
const referenceCodeRoutes = require('./routes/referenceCodes');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/api/streets', streetRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reference-codes', referenceCodeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GPS Navigation API is running' });
});

// Initialize database
db.init();

// Serve static files in production (built React app)
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'web-app', 'dist');
  app.use(express.static(distPath));
  
  // Handle React Router - all routes serve index.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`Serving production build from web-app/dist`);
  }
});


