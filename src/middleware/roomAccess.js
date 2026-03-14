/**
 * Room access control middleware.
 *
 * requireRoomMember — verifies the authenticated user belongs to the room
 *   identified by `req.params.id`. Attaches the RoomMember record as
 *   `req.roomMember`.
 *
 * requireRoomAdmin — must be chained after requireRoomMember.
 *   Verifies the member's role is 'ADMIN'.
 */

const prisma = require("../lib/prisma");

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function requireRoomMember(req, res, next) {
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

    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });

    if (!membership) {
      return res.status(403).json({ error: "You are not a member of this room." });
    }

    req.roomId = room.id;
    req.roomMember = membership;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireRoomAdmin(req, res, next) {
  if (!req.roomMember || req.roomMember.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

module.exports = { requireRoomMember, requireRoomAdmin };
