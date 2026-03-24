/*
 * index.js - Entry point ya server
 * Navigation - Grazing Navigation System
 *
 * Inafanya nini:
 *   1. Inapakia environment variables kutoka .env
 *   2. Inaunda Express HTTP server
 *   3. Inaunganisha Socket.IO kwenye server hiyo hiyo
 *   4. Inasajili route groups zote
 *   5. Inaunganisha MongoDB kisha inaanza kusikiliza kwenye PORT 3000
 *
 * Jinsi ya kuendesha:
 *   sudo systemctl start mongod (au mongod --dbpath ~/mongodb-data)
 *   npm run dev
 */

require('dotenv').config();

const express   = require('express');
const http      = require('http');
const cors      = require('cors');
const mongoose  = require('mongoose');

const authRoutes   = require('./routes/auth');
const zoneRoutes   = require('./routes/zones');
const alertRoutes  = require('./routes/alerts');
const deviceRoutes = require('./routes/devices');
const routeRoutes  = require('./routes/routes');

const { initSocket } = require('./sockets/socketHandler');

const app = express();
app.use(cors());
app.use(express.json());

// Sajili route groups zote
// /auth   -> login na usajili
// /zones  -> maeneo ya ramani
// /alert  -> alerts za uvunjaji
// /device -> GPS ya hardware
// /routes -> njia salama
app.use('/auth',   authRoutes);
app.use('/zones',  zoneRoutes);
app.use('/alert',  alertRoutes);
app.use('/device', deviceRoutes);
app.use('/routes', routeRoutes);

// Health check - angalia kama server inafanya kazi
app.get('/', (_req, res) =>
  res.json({ status: 'Navigation server inafanya kazi', wakati: new Date() })
);

// Socket.IO lazima ishiriki port moja na Express
const server = http.createServer(app);
initSocket(server);

const PORT      = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB imeunganishwa ->', MONGO_URI);
    server.listen(PORT, () =>
      console.log('Navigation server inaendesha kwenye http://localhost:' + PORT)
    );
  })
  .catch((err) => {
    console.error('MongoDB imeshindwa kuunganika:', err.message);
    process.exit(1);
  });
