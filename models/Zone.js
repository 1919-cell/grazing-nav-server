/**
 * ================================================================
 * FILE: models/Zone.js   — MongoDB Zone Schema
 * ================================================================
 *
 * WHAT IS A ZONE?
 *   An area drawn on the map by the admin. Stored as GeoJSON
 *   (the universal standard for geographic shapes in JSON).
 *
 * MAP COLOURS:
 *   restricted → red    do not enter (gov reserve / farmland)
 *   available  → green  safe to graze
 *   occupied   → gray   another pastoralist is here right now
 *
 * GEOJSON POLYGON FORMAT:
 *   {
 *     type: "Polygon",
 *     coordinates: [
 *       [ [lng,lat], [lng,lat], [lng,lat], [lng,lat] ]
 *       //  ↑ outer ring — first and last point must be identical
 *     ]
 *   }
 *   IMPORTANT: GeoJSON is [longitude, latitude] — Leaflet is [lat, lng]!
 *   The mapBridge.js service handles this swap automatically.
 *
 * WHY GEOJSON?
 *   Leaflet displays it natively.
 *   Turf.js uses it for in-app point-in-polygon checks.
 *   ESP32 downloads it for offline hardware fence-checking.
 */

const mongoose = require('mongoose');

const zoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    type: {
      type: String,
      enum: ['restricted', 'available', 'occupied'],
      required: true,
    },

    description: { type: String, default: '' },

    // The actual geographic shape drawn by admin
    geometry: {
      type:        { type: String, enum: ['Polygon', 'MultiPolygon'], required: true },
      coordinates: { type: Array,  required: true },
    },

    // ── Occupancy ──────────────────────────────────────────────
    // Filled in when pastoralist presses "Start grazing"
    // Cleared when they press "Leave zone"
    occupiedBy: {
      userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      userName: { type: String, default: null },
      since:    { type: Date,   default: null },
    },
  },
  { timestamps: true }
);

// MongoDB 2dsphere index — enables geospatial queries
// e.g. "find all zones that contain this GPS point"
zoneSchema.index({ geometry: '2dsphere' });

module.exports = mongoose.model('Zone', zoneSchema);
