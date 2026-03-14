/**
 * Room controller
 *
 * Implements all room-scoped operations:
 *   - Room creation and retrieval
 *   - Joining a room
 *   - Role management
 *   - Location and time-block management (Admin only)
 *   - Shift assignments (Admin only)
 *   - Full schedule compilation
 *
 * Response shapes use snake_case field names to match the frontend
 * TypeScript interfaces defined in types/index.ts.
 */

const { validationResult } = require("express-validator");
const prisma = require("../lib/prisma");

const VALID_ROLES = ["ADMIN", "PARTICIPANT"];

// ---------------------------------------------------------------------------
// Response mappers (Prisma camelCase → API snake_case)
// ---------------------------------------------------------------------------

function mapRoom(room) {
  return { id: room.id, number: room.number, name: room.name, created_at: room.createdAt };
}

function mapLocation(loc) {
  return { id: loc.id, room_id: loc.roomId, name: loc.name };
}

function mapTimeBlock(tb) {
  return {
    id: tb.id,
    room_id: tb.roomId,
    name: tb.name,
    start_time: tb.startTime,
    end_time: tb.endTime,
  };
}

function mapAssignment(a) {
  const base = {
    id: a.id,
    room_id: a.roomId,
    time_block_id: a.timeBlockId,
    shift_location_id: a.shiftLocationId,
    user_id: a.userId,
    date: a.date,
  };
  if (a.user) base.user = a.user;
  if (a.shiftLocation) base.location = mapLocation(a.shiftLocation);
  if (a.timeBlock) base.time_block = mapTimeBlock(a.timeBlock);
  return base;
}

function mapMember(m) {
  const base = { room_id: m.roomId, user_id: m.userId, role: m.role };
  if (m.user) base.user = m.user;
  return base;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

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

async function createRoom(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const { number } = req.body;
  const userId = req.user.userId;

  try {
    // Return existing room if found, otherwise create it.
    const existing = await prisma.room.findUnique({ where: { number } });
    if (existing) {
      return res.status(200).json(mapRoom(existing));
    }

    const room = await prisma.room.create({
      data: {
        number,
        name: `Room ${number}`,
        members: { create: { userId, role: "ADMIN" } },
      },
    });

    return res.status(201).json(mapRoom(room));
  } catch (err) {
    next(err);
  }
}

async function getRoom(req, res, next) {
  const roomId = req.roomId;

  try {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
        },
        locations: true,
        timeBlocks: { orderBy: { startTime: "asc" } },
      },
    });

    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    return res.status(200).json({
      ...mapRoom(room),
      members: room.members.map(mapMember),
      locations: room.locations.map(mapLocation),
      time_blocks: room.timeBlocks.map(mapTimeBlock),
    });
  } catch (err) {
    next(err);
  }
}

async function joinRoom(req, res, next) {
  const roomNumber = parseInt(req.params.id, 10);
  const userId = req.user.userId;

  if (isNaN(roomNumber)) {
    return res.status(404).json({ error: "Room not found." });
  }

  try {
    const room = await prisma.room.findUnique({ where: { number: roomNumber } });
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }
    const roomId = room.id;

    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });

    if (existing) {
      return res.status(200).json({ message: "Already a member.", member: mapMember(existing) });
    }

    // Only pre-added members may join — self-join is not allowed.
    return res.status(403).json({ error: "You have not been added to this room. Ask an admin to add you." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Member management
// ---------------------------------------------------------------------------

/**
 * POST /api/rooms/:id/members
 * Adds a user by name to the room as a Participant. Admin only.
 * Creates the user account if it doesn't exist yet.
 *
 * @param {import('express').Request}  req  Body: { name }
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function addMemberByName(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.roomId;
  const { name } = req.body;

  try {
    // Upsert user by name (creates account if they haven't registered yet)
    const user = await prisma.user.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });

    if (existing) {
      return res.status(200).json({ message: "Already a member.", member: mapMember({ ...existing, user }) });
    }

    const member = await prisma.roomMember.create({
      data: { roomId, userId: user.id, role: "PARTICIPANT" },
      include: { user: { select: { id: true, name: true } } },
    });

    return res.status(201).json(mapMember(member));
  } catch (err) {
    next(err);
  }
}

async function updateMemberRole(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.roomId;
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

async function removeMember(req, res, next) {
  const roomId = req.roomId;
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

async function addLocation(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.roomId;
  const { name } = req.body;

  try {
    const existing = await prisma.shiftLocation.findFirst({ where: { roomId, name } });
    if (existing) {
      return res.status(409).json({ error: `A location named "${name}" already exists.` });
    }

    const location = await prisma.shiftLocation.create({ data: { roomId, name } });
    return res.status(201).json(mapLocation(location));
  } catch (err) {
    next(err);
  }
}

async function removeLocation(req, res, next) {
  const roomId = req.roomId;
  const { locationId } = req.params;

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
// Time blocks
// ---------------------------------------------------------------------------

async function addTimeBlock(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.roomId;
  const { name, start_time: startTime, end_time: endTime } = req.body;

  try {
    const existing = await prisma.timeBlock.findFirst({ where: { roomId, name } });
    if (existing) {
      return res.status(409).json({ error: `A time block named "${name}" already exists.` });
    }

    const timeBlock = await prisma.timeBlock.create({
      data: { roomId, name, startTime, endTime },
    });

    return res.status(201).json(mapTimeBlock(timeBlock));
  } catch (err) {
    next(err);
  }
}

async function removeTimeBlock(req, res, next) {
  const roomId = req.roomId;
  const { blockId } = req.params;

  try {
    const timeBlock = await prisma.timeBlock.findFirst({ where: { id: blockId, roomId } });
    if (!timeBlock) {
      return res.status(404).json({ error: "Time block not found in this room." });
    }

    await prisma.timeBlock.delete({ where: { id: blockId } });
    return res.status(200).json({ message: "Time block removed." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

async function assignShift(req, res, next) {
  if (handleValidationErrors(req, res)) return;

  const roomId = req.roomId;
  const {
    time_block_id: timeBlockId,
    shift_location_id: shiftLocationId,
    user_id: userId,
    date,
  } = req.body;

  try {
    const [timeBlock, shiftLocation, membership] = await Promise.all([
      prisma.timeBlock.findFirst({ where: { id: timeBlockId, roomId } }),
      prisma.shiftLocation.findFirst({ where: { id: shiftLocationId, roomId } }),
      prisma.roomMember.findUnique({ where: { roomId_userId: { roomId, userId } } }),
    ]);

    if (!timeBlock) {
      return res.status(404).json({ error: "Time block not found in this room." });
    }
    if (!shiftLocation) {
      return res.status(404).json({ error: "Location not found in this room." });
    }
    if (!membership) {
      return res.status(404).json({ error: "Target user is not a member of this room." });
    }

    const assignment = await prisma.shiftAssignment.create({
      data: { roomId, timeBlockId, shiftLocationId, userId, date },
      include: {
        timeBlock: true,
        shiftLocation: true,
        user: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(mapAssignment(assignment));
  } catch (err) {
    if (err.code === "P2002") {
      return res
        .status(409)
        .json({ error: "This user is already assigned to that shift and location on that date." });
    }
    next(err);
  }
}

async function removeAssignment(req, res, next) {
  const roomId = req.roomId;
  const { assignmentId } = req.params;

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

async function getSchedule(req, res, next) {
  const roomId = req.roomId;

  try {
    const [locations, timeBlocks, assignments] = await Promise.all([
      prisma.shiftLocation.findMany({ where: { roomId } }),
      prisma.timeBlock.findMany({
        where: { roomId },
        orderBy: { startTime: "asc" },
      }),
      prisma.shiftAssignment.findMany({
        where: { roomId },
        include: {
          shiftLocation: true,
          timeBlock: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    return res.status(200).json({
      locations: locations.map(mapLocation),
      time_blocks: timeBlocks.map(mapTimeBlock),
      assignments: assignments.map(mapAssignment),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteRoom(req, res, next) {
  const roomId = req.roomId;
  try {
    await prisma.room.delete({ where: { id: roomId } });
    return res.status(200).json({ message: "Room deleted." });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createRoom,
  getRoom,
  joinRoom,
  deleteRoom,
  addMemberByName,
  updateMemberRole,
  removeMember,
  addLocation,
  removeLocation,
  addTimeBlock,
  removeTimeBlock,
  assignShift,
  removeAssignment,
  getSchedule,
};
