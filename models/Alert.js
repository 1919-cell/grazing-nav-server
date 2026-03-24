/**
 * ================================================================
 * FILE: models/Alert.js  — MongoDB Alert Schema
 * ================================================================
 *
 * WHAT IS AN ALERT?
 *   A record of a zone-breach event. Created when:
 *   a) ESP32 hardware detects animals inside a restricted zone
 *      and POSTs to  POST /alert/zone-breach
 *   b) The phone app's Turf.js check detects the user in a zone
 *
 * AFTER SAVING:
 *   server sends SMS via Africa's Talking to the pastoralist's phone
 *   server emits Socket.IO "alert:new" so the app shows a popup
 */

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User',  default: null },
    deviceId: { type: String, default: null },  // ESP32 hardware ID

    zoneId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', required: true },
    zoneName: { type: String },                  // cached name for quick display

    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },

    // Where did the breach detection happen?
    source: { type: String, enum: ['hardware', 'app'], default: 'hardware' },

    smsSent: { type: Boolean, default: false },  // was SMS delivered?
    read:    { type: Boolean, default: false },  // has user seen it in app?
  },
  { timestamps: true }  // createdAt = exact breach time
);

module.exports = mongoose.model('Alert', alertSchema);
