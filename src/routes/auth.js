/**
 * Auth routes
 *
 * POST /api/auth/session — find or create user by name, return JWT
 */

const { Router } = require("express");
const { body } = require("express-validator");
const { session } = require("../controllers/authController");

const router = Router();

router.post(
  "/session",
  [body("name").trim().notEmpty().withMessage("name is required.")],
  session
);

module.exports = router;
