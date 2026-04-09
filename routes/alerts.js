/**
 * ================================================================
 * FILE: routes/alerts.js  — Alert Routes
 * ================================================================
 *
 * ENDPOINTS:
 *   GET  /alert/my            → pastoralist gets their own alerts
 *   PATCH /alert/:id/read     → mark an alert as read in the app
 *
 * NOTE:
 *   Hardware-triggered breach + SMS handling has been removed from server.
 *   Breach detection/notification is now handled on-device and in-app.
 */

const express        = require('express');
const Alert          = require('../models/Alert');
const { protect }    = require('../middleware/auth');

const router = express.Router();

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
