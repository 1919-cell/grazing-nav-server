/**
 * ================================================================
 * FILE: routes/auth.js  — Authentication Routes
 * ================================================================
 *
 * ENDPOINTS:
 *   POST /auth/register  → create a new pastoralist account
 *   POST /auth/login     → pastoralist login (phone + password)
 *   POST /auth/admin     → admin login (secretKey + password)
 *
 * WHAT IS A JWT?
 *   After login, the server returns a token (long encrypted string).
 *   The app stores this and sends it with every future request in
 *   the Authorization header:  "Bearer <token>"
 *   This proves the user is logged in without sending the password again.
 *
 * TEST WITH CURL:
 *   curl -X POST http://localhost:3000/auth/login \
 *        -H "Content-Type: application/json" \
 *        -d '{"phone":"+255712345678","password":"mypassword"}'
 */

const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');

const router = express.Router();

// ── Helper: create a signed JWT for a user ────────────────────
// id   = MongoDB _id of the user
// role = 'pastoralist' or 'admin'
// Token expires in 30 days — user stays logged in across app restarts
const signToken = (id, role) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '30d' });

// ── POST /auth/register ────────────────────────────────────────
// Body: { name, phone, password }
// Creates a new pastoralist user.
// Admin accounts are created directly in MongoDB (not via this endpoint).
router.post('/register', async (req, res) => {
  try {
    const { name, phone, password } = req.body;

    if (!name || !phone || !password)
      return res.status(400).json({ error: 'name, phone, and password required' });

    // Check if phone already registered
    const exists = await User.findOne({ phone });
    if (exists)
      return res.status(409).json({ error: 'Phone number already registered' });

    // Create user — password is hashed by the pre-save hook in User.js
    const user = await User.create({ name, phone, password, role: 'pastoralist' });

    res.status(201).json({
      message: 'Account created',
      token: signToken(user._id, user.role),
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /auth/login ───────────────────────────────────────────
// Body: { phone, password }
// Returns a JWT token if credentials are correct.
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password)
      return res.status(400).json({ error: 'phone and password required' });

    // Find user by phone number
    const user = await User.findOne({ phone });
    if (!user)
      return res.status(401).json({ error: 'Invalid phone or password' });

    // Check password using the method defined in User.js
    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ error: 'Invalid phone or password' });

    res.json({
      token: signToken(user._id, user.role),
      user: { id: user._id, name: user.name, phone: user.phone, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /auth/admin ───────────────────────────────────────────
// Body: { secretKey, password }
// Admin login — secretKey is stored in .env, not exposed in the app store.
router.post('/admin', async (req, res) => {
  try {
    const { secretKey, password } = req.body;

    // First check the secret key matches the one in .env
    if (secretKey !== process.env.ADMIN_SECRET_KEY)
      return res.status(401).json({ error: 'Invalid secret key' });

    // Find the admin user (there should only be one)
    const admin = await User.findOne({ role: 'admin' });
    if (!admin)
      return res.status(404).json({ error: 'Admin account not configured' });

    const match = await admin.comparePassword(password);
    if (!match)
      return res.status(401).json({ error: 'Invalid password' });

    res.json({
      token: signToken(admin._id, admin.role),
      user: { id: admin._id, name: admin.name, role: admin.role },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
