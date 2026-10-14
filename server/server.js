require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/', (_, res) => res.send('PlacePrep AI API is running'));
app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', require('./routes'));
app.use(require('./middleware/error'));

const PORT = process.env.PORT || 5000;
connectDB().then(() => app.listen(PORT, () => console.log(`API running on :${PORT}`)));
