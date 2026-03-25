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

app.use('/auth',   authRoutes);
app.use('/zones',  zoneRoutes);
app.use('/alert',  alertRoutes);
app.use('/device', deviceRoutes);
app.use('/routes', routeRoutes);

app.get('/', (_req, res) =>
  res.json({ status: 'Navigation server inafanya kazi', wakati: new Date() })
);

const server = http.createServer(app);
initSocket(server);

// Railway inatoa PORT yake yenyewe - lazima uitumie
const PORT      = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB imeunganishwa');
    server.listen(PORT, '0.0.0.0', () =>
      console.log('Server inaendesha kwenye port ' + PORT)
    );
  })
  .catch((err) => {
    console.error('MongoDB imeshindwa:', err.message);
    process.exit(1);
  });
