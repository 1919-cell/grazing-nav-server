/**
 * ================================================================
 * FILE: models/Device.js  — MongoDB Device Schema
 * ================================================================
 *
 * WHAT IS A DEVICE?
 *   The TTGO T-Call (ESP32 + SIM800L) hardware unit attached to
 *   the animal herd. Each unit has a unique ID burned in firmware.
 *
 * GPS TRACKING (data SIM only):
 *   ESP32 → POST /device/location  { deviceId, lat, lng }
 *   Server updates lastLocation here
 *   Server emits Socket.IO "device:moved" → purple dot moves on map
 *
 * SMS-ONLY PROTOTYPE:
 *   Device only sends breach alerts via SMS (no data SIM needed).
 *   The Device record still exists for admin management.
 */

const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true }, // e.g. "DEV-001"

    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    label: { type: String, default: 'Unnamed Device' },  // shown on map

    lastLocation: {
      lat:       { type: Number, default: null },
      lng:       { type: Number, default: null },
      updatedAt: { type: Date,   default: null },
    },

    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Device', deviceSchema);
