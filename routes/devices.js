/**
 * ================================================================
 * FILE: routes/devices.js  — Hardware Device Routes
 * ================================================================
 *
 * ENDPOINTS:
 *   POST /device/location    → ESP32 posts its GPS every 30 s (data SIM)
 *   GET  /device/zones       → ESP32 downloads zone GeoJSON on boot
 *   POST /device/register    → admin registers a new device
 *   GET  /device/all         → admin sees all devices and positions
 *
 * HARDWARE → SERVER FLOW (when data SIM installed):
 *   ESP32 reads GPS → HTTP POST /device/location { deviceId, lat, lng }
 *   Server updates Device.lastLocation in MongoDB
 *   Server emits Socket.IO "device:moved" → purple dot moves on all maps
 *
 * SMS-ONLY PROTOTYPE:
 *   POST /device/zones is still used — the ESP32 downloads zone coords
 *   on boot via HTTP even in the SMS-only prototype (brief data burst).
 *   After that, all breach detection is offline on the ESP32 itself.
 */

const express  = require('express');
const Device   = require('../models/Device');
const Zone     = require('../models/Zone');
const { protect, requireAdmin } = require('../middleware/auth');
const { getIO } = require('../sockets/socketHandler');

const router = express.Router();

// ── POST /device/location ─────────────────────────────────────
// The ESP32 calls this every 30 seconds (needs data SIM).
// No JWT — the deviceId in the body is the identifier.
// Body: { deviceId: "DEV-001", lat: -8.9, lng: 33.5 }
router.post('/location', async (req, res) => {
  try {
    const { deviceId, lat, lng } = req.body;

    if (!deviceId || lat == null || lng == null)
      return res.status(400).json({ error: 'deviceId, lat, lng required' });

    // Find and update the device's last known position
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        lastLocation: { lat, lng, updatedAt: new Date() },
        isActive: true,
      },
      { new: true }
    ).populate('owner', 'name phone');

    if (!device) return res.status(404).json({ error: 'Device not registered' });

    // Broadcast to all apps — the purple marker moves on the map
    getIO().emit('device:moved', {
      deviceId,
      label:  device.label,
      lat,
      lng,
      ownerId: device.owner?._id,
    });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /device/zones ─────────────────────────────────────────
// ESP32 downloads all zone GeoJSON coordinates on boot.
// This allows the hardware to do offline point-in-polygon checks.
// Only RESTRICTED zones are sent — that is what the fence checks.
// No JWT — hardware cannot store tokens easily.
router.get('/zones', async (req, res) => {
  try {
    const zones = await Zone.find({ type: 'restricted' }).select('name geometry');

    // Return minimal format to reduce payload size for SIM800L
    const payload = zones.map((z) => ({
      id:       z._id,
      name:     z.name,
      geometry: z.geometry,  // GeoJSON Polygon coordinates
    }));

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /device/map ───────────────────────────────────────────
// Pastoralists see their own animal devices on the map.
// Admins see all devices.
router.get('/map', protect, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { owner: req.user._id };
    const devices = await Device.find(query).populate('owner', 'name phone');

    const payload = devices
      .filter((device) => device.lastLocation?.lat != null && device.lastLocation?.lng != null)
      .map((device) => ({
        deviceId: device.deviceId,
        label: device.label,
        lat: device.lastLocation.lat,
        lng: device.lastLocation.lng,
        updatedAt: device.lastLocation.updatedAt,
        isActive: device.isActive,
        ownerId: device.owner?._id,
        ownerName: device.owner?.name,
      }));

    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /device/register ─────────────────────────────────────
// Admin registers a new ESP32 device and assigns it to a user.
// Body: { deviceId, label, ownerPhone }
router.post('/register', protect, requireAdmin, async (req, res) => {
  try {
    const { deviceId, label, ownerPhone } = req.body;

    const User  = require('../models/User');
    const owner = await User.findOne({ phone: ownerPhone });
    if (!owner) return res.status(404).json({ error: 'Owner phone not found' });

    const device = await Device.create({ deviceId, label, owner: owner._id });
    res.status(201).json(device);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /device/all ───────────────────────────────────────────
// Admin sees all devices and their last known positions.
router.get('/all', protect, requireAdmin, async (req, res) => {
  try {
    const devices = await Device.find().populate('owner', 'name phone');
    res.json(devices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
