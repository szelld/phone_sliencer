const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('./config');

async function authenticateUser(username, password) {
  try {
    if (username !== config.admin.username) {
      return null;
    }

    const isValid = await bcrypt.compare(password, config.admin.passwordHash);
    if (!isValid) {
      return null;
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return { token, user: { username, role: 'admin' } };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required' });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

module.exports = {
  authenticateUser,
  verifyToken,
  requireAuth
};