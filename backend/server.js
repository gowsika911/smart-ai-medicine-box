require('dotenv').config();

// Render runs on UTC. Dose times are entered in the patient's local time, so force
// the server clock to the same timezone (override with the TZ env var if needed).
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const medicineRoutes = require('./routes/medicineRoutes');
const authRoutes = require('./routes/authRoutes');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const doseLogRoutes = require('./routes/doseLogRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const alertRoutes = require('./routes/alertRoutes');
const riskRoutes = require('./routes/riskRoutes');
const { startScheduler } = require('./utils/scheduler');

const app = express();

// Middleware
// CORS: set CORS_ORIGIN in Render to your Vercel URL (comma-separated for several).
// If it is not set, all origins are allowed so nothing breaks.
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : undefined));
app.use(express.json());
app.use('/api/medicines', medicineRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/doselogs', doseLogRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/risk', riskRoutes);

// Test route
app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/', (req, res) => {
  res.json({ message: 'Smart AI Medicine Box API is running' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startScheduler();
  })
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
