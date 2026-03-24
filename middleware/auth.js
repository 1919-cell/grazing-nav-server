/*
 * middleware/auth.js - Uthibitishaji wa JWT
 *
 * Middleware ni function inayoendesha KATI ya kupokea ombi na kutoa jibu.
 *
 * JWT (JSON Web Token) ni string iliyosainiwa inayothibitisha mtumiaji.
 * App inapata token baada ya kuingia, na kuituma na kila ombi kwenye:
 *   Authorization: Bearer <token>
 *
 * Jinsi ya kutumia kwenye route:
 *   router.get('/zones', protect, zonesController.getAll);
 *   router.post('/zones', protect, requireAdmin, zonesController.create);
 *
 * protect     -> mtumiaji yeyote aliyeingia
 * requireAdmin -> admin peke yake
 */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// Thibitisha token ya mtumiaji
const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Hakuna token - tafadhali ingia kwanza' });
    }

    const token   = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ error: 'Mtumiaji hapatikani' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token si sahihi au imeisha muda' });
  }
};

// Ruhusu admin peke yake kupita
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Inahitaji ruhusa ya msimamizi' });
  }
  next();
};

module.exports = { protect, requireAdmin };
