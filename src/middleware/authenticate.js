/**
 * authenticate middleware
 *
 * Validates the Bearer JWT and verifies the user still exists in the
 * database. Returns 401 if the token is invalid, expired, or references
 * a deleted/reset user — so stale tokens are always rejected cleanly.
 */

const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header." });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "User no longer exists." });
    }

    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = authenticate;
