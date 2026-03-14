/**
 * Auth controller — name-only identity.
 *
 * POST /api/auth/session
 *   Finds an existing user by name or creates a new one, then returns a
 *   signed JWT. No password required — the name is the sole identifier.
 */

const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma");

/**
 * @param {{ id: string, name: string }} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign(
    { userId: user.id, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

/**
 * POST /api/auth/session
 *
 * @param {import('express').Request}  req  Body: { name }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function session(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  const { name } = req.body;

  try {
    const user = await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    const token = signToken(user);
    return res.status(200).json({
      token,
      user: { userId: user.id, name: user.name },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { session };
