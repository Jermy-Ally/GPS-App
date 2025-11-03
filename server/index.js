const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
require('dotenv').config();

const streetRoutes = require('./routes/streets');
const db = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes
app.use('/api/streets', streetRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'GPS Navigation API is running' });
});

// Initialize database
db.init();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


