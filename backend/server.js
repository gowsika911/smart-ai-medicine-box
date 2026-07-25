require('dotenv').config();
const medicineRoutes = require('./routes/medicineRoutes');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/medicines', medicineRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Smart AI Medicine Box API is running' });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});