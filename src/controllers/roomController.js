/**
 * Room controller
 *
 * Implements all room-scoped operations:
 *   - Room creation and retrieval
 *   - Joining a room
 *   - Role management
 *   - Location and shift-time management (Admin only)
 *   - Shift assignments (Admin only)
 *   - Full schedule compilation
 *
 * Response shapes use snake_case field names to match the frontend
 * TypeScript interfaces defined in types/index.ts.
 */

const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma");

const VALID_ROLES = ["ADMIN", "PARTICIPANT"];
const VALID_SHIFT_TYPES = ["MORNING", "EVENING", "NIGHT"];

// ---------------------------------------------------------------------------
// Response mappers (Prisma camelCase → API snake_case)
// ---------------------------------------------------------------------------

/**
 * @param {{ id: string, name: string, createdAt: Date }} room
 * @returns {{ id: string, name: string, created_at: string }}
 */
function mapRoom(room) {
  return { id: room.id, name: room.name, created_at: room.createdAt };
}

/**
 * @param {{ id: string, roomId: string, name: string }} loc
 * @returns {{ id: string, room_id: string, name: string }}
 */
function mapLocation(loc) {
  return { id: loc.id, room_id: loc.roomId, name: loc.name };
}

/**
 * @param {{ id: string, roomId: string, type: string, date: Date }} st
 * @returns {{ id: string, room_id: string, type: string, date: string }}
 */
function mapShiftTime(st) {
  return { id: st.id, room_id: st.roomId, type: st.type, date: st.date };
}

/**
 * @param {object} a  Prisma ShiftAssignment (may include nested shiftLocation / user)
 * @returns {object}
 */
function mapAssignment(a) {
  const base = {
    id: a.id,
    room_id: a.roomId,
    shift_time_id: a.shiftTimeId,
    shift_location_id: a.shiftLocationId,
    user_id: a.userId,
  };
  if (a.user) base.user = a.user;
  if (a.shiftLocation) base.location = mapLocation(a.shiftLocation);
  if (a.shiftTime) base.time = mapShiftTime(a.shiftTime);
  return base;
}

/**
 * @param {{ roomId: string, userId: string, role: string, user?: object }} m
 * @returns {{ room_id: string, user_id: string, role: string, user?: object }}
 */
function mapMember(m) {
  const base = { room_id: m.roomId, user_id: m.userId, role: m.role };
  if (m.user) base.user = m.user;
  return base;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Sends 422 with validation errors and returns true when errors are present.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @returns {boolean}
 */
function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() });
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

/**
 * POST /api/rooms
 * Creates a new room and assigns the requesting user as its initial Admin.
 *
 * @param {import('express').Request}  req  Body: { name }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function createRoom(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const { name } = req.body;
  const userId = req.user.userId;

  try {
    const room = await prisma.room.create({
      data: {
        name,
        members: { create: { userId, role: "ADMIN" } },
      },
    });

    return res.status(201).json(mapRoom(room));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/rooms/:id
 * Returns room details including members, locations, and shift times.
 * Requires authenticated room membership.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getRoom(req, res, next) {
  const roomId = req.params.id;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
        locations: true,
        shiftTimes: { orderBy: [{ date: "asc" }, { type: "asc" }] },
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    return res.status(200).json({
      ...mapRoom(room),
      members: room.members.map(mapMember),
      locations: room.locations.map(mapLocation),
      shift_times: room.shiftTimes.map(mapShiftTime),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/rooms/:id/join
 * Adds the requesting user to the room as a Participant.
 * Responds gracefully if they are already a member.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function joinRoom(req, res, next) {
  const roomId = req.params.id;
  const userId = req.user.userId;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing) {
      return res.status(200).json({ message: "Already a member.", member: mapMember(existing) });
    }

    const member = await prisma.roomMember.create({
      data: { roomId, userId, role: "PARTICIPANT" },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json(mapMember(member));
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/**
 * PUT /api/rooms/:id/members/:userId/role
 * Updates the role of a room member. Admin only.
 *
 * @param {import('express').Request}  req  Body: { role }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function updateMemberRole(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = req.body;

  if (!VALID_ROLES.includes(role)) {
    return res.status(422).json({ error: `role must be one of: ${VALID_ROLES.join(", ")}.` });
  }

  try {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    if (!membership) {
      return res.status(404).json({ error: "Member not found in this room." });
    }

    const updated = await prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId: targetUserId } },
      data: { role },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(200).json(mapMember(updated));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rooms/:id/members/:userId
 * Removes a participant from the room. Admin only.
 * Prevents removal of the last Admin or self-removal.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function removeMember(req, res, next) {
  const roomId = req.params.id;
  const targetUserId = req.params.userId;
  const requestingUserId = req.user.userId;

  if (targetUserId === requestingUserId) {
    return res.status(400).json({ error: "Admins cannot remove themselves from the room." });
  }

  try {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    if (!membership) {
      return res.status(404).json({ error: "Member not found in this room." });
    }

    if (membership.role === "ADMIN") {
      const adminCount = await prisma.roomMember.count({ where: { roomId, role: "ADMIN" } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "Cannot remove the last Admin of a room." });
      }
    }

    await prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });

    return res.status(200).json({ message: "Member removed." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Locations
// ---------------------------------------------------------------------------

/**
 * POST /api/rooms/:id/locations
 * Adds a named location to the room. Admin only.
 *
 * @param {import('express').Request}  req  Body: { name }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function addLocation(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.params.id;
  const { name } = req.body;

  try {
    const location = await prisma.shiftLocation.create({ data: { roomId, name } });
    return res.status(201).json(mapLocation(location));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rooms/:id/locations/:locationId
 * Removes a location and its cascading assignments. Admin only.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function removeLocation(req, res, next) {
  const { id: roomId, locationId } = req.params;

  try {
    const location = await prisma.shiftLocation.findFirst({ where: { id: locationId, roomId } });
    if (!location) {
      return res.status(404).json({ error: "Location not found in this room." });
    }

    await prisma.shiftLocation.delete({ where: { id: locationId } });
    return res.status(200).json({ message: "Location removed." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Shift times
// ---------------------------------------------------------------------------

/**
 * POST /api/rooms/:id/times
 * Adds a shift time slot (type + date) to the room. Admin only.
 *
 * @param {import('express').Request}  req  Body: { type, date }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function addShiftTime(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.params.id;
  const { type, date } = req.body;

  if (!VALID_SHIFT_TYPES.includes(type)) {
    return res
      .status(422)
      .json({ error: `type must be one of: ${VALID_SHIFT_TYPES.join(", ")}.` });
  }

  try {
    const shiftTime = await prisma.shiftTime.create({
      data: { roomId, type, date: new Date(date) },
    });

    return res.status(201).json(mapShiftTime(shiftTime));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/rooms/:id/times/:timeId
 * Removes a shift time and its cascading assignments. Admin only.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function removeShiftTime(req, res, next) {
  const { id: roomId, timeId } = req.params;

  try {
    const shiftTime = await prisma.shiftTime.findFirst({ where: { id: timeId, roomId } });
    if (!shiftTime) {
      return res.status(404).json({ error: "Shift time not found in this room." });
    }

    await prisma.shiftTime.delete({ where: { id: timeId } });
    return res.status(200).json({ message: "Shift time removed." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

/**
 * POST /api/rooms/:id/assignments
 * Assigns a participant to a specific shift time and location. Admin only.
 * Accepts body keys in snake_case to match the frontend API client.
 *
 * @param {import('express').Request}  req  Body: { shift_time_id, shift_location_id, user_id }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function assignShift(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.params.id;
  const { shift_time_id: shiftTimeId, shift_location_id: shiftLocationId, user_id: userId } = req.body;

  try {
    const [shiftTime, shiftLocation, membership] = await Promise.all([
      prisma.shiftTime.findFirst({ where: { id: shiftTimeId, roomId } }),
      prisma.shiftLocation.findFirst({ where: { id: shiftLocationId, roomId } }),
      prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);

    if (!shiftTime) {
      return res.status(404).json({ error: "Shift time not found in this room." });
    }
    if (!shiftLocation) {
      return res.status(404).json({ error: "Location not found in this room." });
    }
    if (!membership) {
      return res.status(404).json({ error: "Target user is not a member of this room." });
    }

    const assignment = await prisma.shiftAssignment.create({
      data: { roomId, shiftTimeId, shiftLocationId, userId },
      include: {
        shiftTime: true,
        shiftLocation: true,
        user: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(mapAssignment(assignment));
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "This user is already assigned to that shift and location." });
    }
    next(err);
  }
}

/**
 * DELETE /api/rooms/:id/assignments/:assignmentId
 * Removes a shift assignment. Admin only.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function removeAssignment(req, res, next) {
  const { id: roomId, assignmentId } = req.params;

  try {
    const assignment = await prisma.shiftAssignment.findFirst({
      where: { id: assignmentId, roomId },
    });

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found in this room." });
    }

    await prisma.shiftAssignment.delete({ where: { id: assignmentId } });
    return res.status(200).json({ message: "Assignment removed." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Schedule
// ---------------------------------------------------------------------------

/**
 * GET /api/rooms/:id/schedule
 * Returns the full compiled schedule as flat parallel arrays to match the
 * FullSchedule interface: { locations, times, assignments }.
 * Requires room membership.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getSchedule(req, res, next) {
  const roomId = req.params.id;

  try {
    const [locations, times, assignments] = await Promise.all([
      prisma.shiftLocation.findMany({ where: { roomId } }),
      prisma.shiftTime.findMany({
        where: { roomId },
        orderBy: [{ date: "asc" }, { type: "asc" }],
      }),
      prisma.shiftAssignment.findMany({
        where: { roomId },
        include: {
          shiftLocation: true,
          shiftTime: true,
          user: { select: { id: true, name: true } },
        },
      }),
    ]);

    return res.status(200).json({
      locations: locations.map(mapLocation),
      times: times.map(mapShiftTime),
      assignments: assignments.map(mapAssignment),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
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
};
