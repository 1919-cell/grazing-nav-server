/**
 * ================================================================
 * FILE: routes/alerts.js  — Alert Routes
 * ================================================================
 *
 * ENDPOINTS:
 *   POST /alert/zone-breach   → hardware or app reports a breach
 *   GET  /alert/my            → pastoralist gets their own alerts
 *   PATCH /alert/:id/read     → mark an alert as read in the app
 *
 * BREACH FLOW:
 *   ESP32 detects animal in restricted zone
 *     → POST /alert/zone-breach { deviceId, zoneId, lat, lng }
 *     → server saves the Alert document
 *     → server sends SMS via Africa's Talking to pastoralist's phone
 *     → server emits Socket.IO "alert:new" → app shows red popup
 *
 * AFRICA'S TALKING SMS:
 *   Tanzania network: Vodacom (+255 75x), Airtel (+255 68x)
 *   The SMS routes through AT's API gateway to the 2G tower.
 *   Works even in areas with no data — just needs 2G voice/SMS signal.
 */

const express        = require('express');
const Alert          = require('../models/Alert');
const Zone           = require('../models/Zone');
const User           = require('../models/User');
const Device         = require('../models/Device');
const { protect }    = require('../middleware/auth');
const { getIO }      = require('../sockets/socketHandler');
const AfricasTalking = require('africastalking');

const router = express.Router();

// ── Africa's Talking SMS client setup ─────────────────────────
// Credentials come from .env — never hard-code API keys!
const atClient = AfricasTalking({
  apiKey:   process.env.AT_API_KEY,
  username: process.env.AT_USERNAME,
});
const sms = atClient.SMS;

// ── POST /alert/zone-breach ────────────────────────────────────
// Called by:
//   a) The ESP32 hardware (no JWT — uses deviceId as identifier)
//   b) The phone app's Turf.js check (sends JWT in header)
//
// Body: { deviceId?, zoneId, lat, lng, source }
// source = 'hardware' | 'app'
router.post('/zone-breach', async (req, res) => {
  try {
    const { deviceId, zoneId, lat, lng, source = 'hardware' } = req.body;

    // ── Find the zone that was breached ──────────────────────
    const zone = await Zone.findById(zoneId);
    if (!zone) return res.status(404).json({ error: 'Zone not found' });

    // ── Find which user to alert ──────────────────────────────
    let user = null;

    if (deviceId) {
      // Hardware breach: find the device then the owner
      const device = await Device.findOne({ deviceId }).populate('owner');
      if (device) user = device.owner;
    } else if (req.headers.authorization) {
      // App breach: extract userId from JWT
      const jwt     = require('jsonwebtoken');
      const token   = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = await User.findById(decoded.id);
    }

    // ── Save the Alert document ───────────────────────────────
    const alert = await Alert.create({
      userId:   user?._id   || null,
      deviceId: deviceId    || null,
      zoneId:   zone._id,
      zoneName: zone.name,
      location: { lat, lng },
      source,
    });

    // ── Send SMS via Africa's Talking ─────────────────────────
    let smsSent = false;
    if (user?.phone) {
      try {
        await sms.send({
          to:      [user.phone],
          message: `⚠️ NAVIGATION ALERT: Your animals entered "${zone.name}" (restricted zone). Location: ${lat.toFixed(5)},${lng.toFixed(5)}. Move them immediately.`,
          from:    process.env.AT_SENDER_ID || undefined,
        });
        smsSent = true;
        await Alert.findByIdAndUpdate(alert._id, { smsSent: true });
        console.log(`📱  SMS sent to ${user.phone}`);
      } catch (smsErr) {
        // SMS failure does NOT fail the request — we still save the alert
        console.error('SMS error:', smsErr.message);
      }
    }

    // ── Emit real-time alert to all connected apps ─────────────
    // The pastoralist's app shows a red popup even if they're in the app
    getIO().emit('alert:new', {
      alertId:  alert._id,
      zoneName: zone.name,
      lat, lng,
      source,
      userId:   user?._id,
    });

    res.status(201).json({ alert, smsSent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /alert/my ─────────────────────────────────────────────
// Pastoralist fetches their own alert history for AlertsScreen.
router.get('/my', protect, async (req, res) => {
  try {
    const alerts = await Alert.find({ userId: req.user._id })
      .sort({ createdAt: -1 }) // newest first
      .limit(50);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /alert/:id/read ─────────────────────────────────────
// Mark an alert as seen so the red dot disappears on the alerts icon.
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { read: true },
      { new: true }
    );
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
