/**
 * @file src/routes/calendar.js
 * @description Calendar events JSON endpoint.
 *
 * GET /api/calendar/events?roomId=&userId=&from=&to= — (auth required) return shift events as JSON
 */

const express = require("express");
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/calendar/events
// ---------------------------------------------------------------------------
router.get("/events", authenticate, async (req, res, next) => {
  try {
    const { roomId, userId: targetUserIdParam, from, to } = req.query;
    if (!roomId) return res.status(400).json({ error: "roomId query parameter is required." });

    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !dateRe.test(from)) return res.status(400).json({ error: "Invalid 'from' date. Expected YYYY-MM-DD." });
    if (to && !dateRe.test(to)) return res.status(400).json({ error: "Invalid 'to' date. Expected YYYY-MM-DD." });
    if (from && to && from > to) return res.status(400).json({ error: "'from' date must not be after 'to' date." });

    const requestingUserId = req.user.userId;
    const targetUserId = targetUserIdParam || requestingUserId;

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room) return res.status(404).json({ error: "Room not found." });

    const requesterMembership = room.members.find((m) => m.userId === requestingUserId);
    if (!requesterMembership) return res.status(403).json({ error: "You are not a member of this room." });

    if (targetUserId !== requestingUserId) {
      const targetMembership = room.members.find((m) => m.userId === targetUserId);
      if (!targetMembership) return res.status(403).json({ error: "Target user is not a member of this room." });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return res.status(404).json({ error: "Target user not found." });

    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        roomId: room.id,
        userId: targetUserId,
        date: {
          ...(from && { gte: from }),
          ...(to && { lte: to }),
        },
      },
      include: { timeBlock: true, shiftLocation: true },
    });

    const events = assignments.map((assignment) => {
      const { date, timeBlock, shiftLocation } = assignment;

      const [year, month, day] = date.split("-").map(Number);
      const endIsNextDay = timeBlock.endTime <= timeBlock.startTime;
      const endDateObj = endIsNextDay
        ? new Date(year, month - 1, day + 1)
        : new Date(year, month - 1, day);

      const endYear = endDateObj.getFullYear();
      const endMonth = String(endDateObj.getMonth() + 1).padStart(2, "0");
      const endDay = String(endDateObj.getDate()).padStart(2, "0");

      return {
        name: `${timeBlock.name} @ ${shiftLocation.name}`,
        startDate: date,
        startTime: timeBlock.startTime,
        endDate: `${endYear}-${endMonth}-${endDay}`,
        endTime: timeBlock.endTime,
        location: shiftLocation.name,
      };
    });

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
