/**
 * Manager authentication middleware.
 * Compares the X-Manager-Key header against a bcrypt hash stored in MANAGER_PASSWORD_HASH env var.
 * The plaintext password is never stored in source code.
 */

const bcrypt = require('bcryptjs');

async function managerAuth(req, res, next) {
  const key = req.headers['x-manager-key'];
  const hash = process.env.MANAGER_PASSWORD_HASH;

  if (!key || !hash) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }

  const valid = await bcrypt.compare(key, hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid manager password.' });
  }

  next();
}

module.exports = managerAuth;
