/**
 * Auth routes
 *
 * POST /api/auth/register  — create account
 * POST /api/auth/login     — obtain JWT
 */

const { Router } = require("express");
const { body } = require("express-validator");
const { register, login } = require("../controllers/authController");

const router = Router();

router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("name is required."),
    body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
    body("password")
      .isLength({ min: 8 })
      .withMessage("password must be at least 8 characters."),
  ],
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("A valid email is required."),
    body("password").notEmpty().withMessage("password is required."),
  ],
  login
);

module.exports = router;
