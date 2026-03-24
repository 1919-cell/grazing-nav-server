/**
 * ================================================================
 * FILE: models/Route.js  — MongoDB Route Schema
 * ================================================================
 *
 * WHAT IS A ROUTE?
 *   A safe travel path drawn by the admin. Shown as a blue dashed
 *   line on the map. Guides pastoralists between available zones
 *   while avoiding restricted areas.
 *
 * STORED AS GEOJSON LINESTRING:
 *   {
 *     type: "LineString",
 *     coordinates: [ [lng,lat], [lng,lat], [lng,lat] ... ]
 *   }
 */

const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    geometry: {
      type:        { type: String, enum: ['LineString'], required: true },
      coordinates: { type: Array, required: true },
    },

    fromZone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
    toZone:   { type: mongoose.Schema.Types.ObjectId, ref: 'Zone', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Route', routeSchema);
