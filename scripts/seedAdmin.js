/**
 * FILE: scripts/seedAdmin.js  — Create Admin Account
 *
 * Run ONCE after first setup:
 *   cd ~/projects/grazing-nav-server
 *   node scripts/seedAdmin.js
 *
 * Admin login credentials after running:
 *   Secret Key: value of ADMIN_SECRET_KEY in .env
 *   Password:   admin123   ← change this!
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User     = require('../models/User');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  const exists = await User.findOne({ role: 'admin' });
  if (exists) { console.log('Admin already exists'); process.exit(0); }

  await User.create({
    name: 'System Admin', phone: '+255700000000',
    password: 'admin123', role: 'admin',
  });
  console.log(' Admin created — login with secret key + password: admin123');
  process.exit(0);
}
seed().catch((e) => { console.error(e); process.exit(1); });
