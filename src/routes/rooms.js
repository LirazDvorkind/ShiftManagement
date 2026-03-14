/**
 * Room routes
 *
 * All routes require a valid JWT (authenticate middleware).
 * Routes scoped to a room (/api/rooms/:id/*) also require room membership.
 * Admin-only routes additionally require the ADMIN role via requireRoomAdmin.
 *
 * POST   /api/rooms                              — create room
 * GET    /api/rooms/:id                          — get room details
 * POST   /api/rooms/:id/join                     — join room
 * PUT    /api/rooms/:id/members/:userId/role     — update member role  [Admin]
 * DELETE /api/rooms/:id/members/:userId          — remove member       [Admin]
 * POST   /api/rooms/:id/locations                — add location        [Admin]
 * DELETE /api/rooms/:id/locations/:locationId    — remove location     [Admin]
 * POST   /api/rooms/:id/times                    — add shift time      [Admin]
 * DELETE /api/rooms/:id/times/:timeId            — remove shift time   [Admin]
 * POST   /api/rooms/:id/assignments              — assign user         [Admin]
 * DELETE /api/rooms/:id/assignments/:assignmentId — remove assignment  [Admin]
 * GET    /api/rooms/:id/schedule                 — get full schedule
 */

const { Router } = require("express");
const { body } = require("express-validator");
const authenticate = require("../middleware/authenticate");
const { requireRoomMember, requireRoomAdmin } = require("../middleware/roomAccess");
const {
  createRoom,
  getRoom,
  joinRoom,
  updateMemberRole,
  removeMember,
  addLocation,
  removeLocation,
  addShiftTime,
  removeShiftTime,
  assignShift,
  removeAssignment,
  getSchedule,
} = require("../controllers/roomController");

const router = Router();

// All room routes require authentication.
router.use(authenticate);

// ---------------------------------------------------------------------------
// Room-level (no membership check required for create / join)
// ---------------------------------------------------------------------------

router.post(
  "/",
  [body("name").trim().notEmpty().withMessage("name is required.")],
  createRoom
);

router.post("/:id/join", joinRoom);

// All routes below this point require membership in the room.
const memberRouter = Router({ mergeParams: true });
router.use("/:id", requireRoomMember, memberRouter);

memberRouter.get("/", getRoom);
memberRouter.get("/schedule", getSchedule);

// ---------------------------------------------------------------------------
// Admin-only sub-routes
// ---------------------------------------------------------------------------

memberRouter.put(
  "/members/:userId/role",
  requireRoomAdmin,
  [
    body("role")
      .notEmpty()
      .withMessage("role is required.")
      .isIn(["ADMIN", "PARTICIPANT"])
      .withMessage("role must be ADMIN or PARTICIPANT."),
  ],
  updateMemberRole
);

memberRouter.delete("/members/:userId", requireRoomAdmin, removeMember);

memberRouter.post(
  "/locations",
  requireRoomAdmin,
  [body("name").trim().notEmpty().withMessage("name is required.")],
  addLocation
);

memberRouter.delete("/locations/:locationId", requireRoomAdmin, removeLocation);

memberRouter.post(
  "/times",
  requireRoomAdmin,
  [
    body("type")
      .notEmpty()
      .withMessage("type is required.")
      .isIn(["MORNING", "EVENING", "NIGHT"])
      .withMessage("type must be MORNING, EVENING, or NIGHT."),
    body("date").isISO8601().withMessage("date must be a valid ISO 8601 date."),
  ],
  addShiftTime
);

memberRouter.delete("/times/:timeId", requireRoomAdmin, removeShiftTime);

memberRouter.post(
  "/assignments",
  requireRoomAdmin,
  [
    body("shift_time_id").notEmpty().withMessage("shift_time_id is required."),
    body("shift_location_id").notEmpty().withMessage("shift_location_id is required."),
    body("user_id").notEmpty().withMessage("user_id is required."),
  ],
  assignShift
);

memberRouter.delete("/assignments/:assignmentId", requireRoomAdmin, removeAssignment);

module.exports = router;
