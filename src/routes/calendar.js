/**
 * @file src/routes/calendar.js
 * @description Calendar token management and ICS feed endpoints.
 *
 * GET /api/calendar/token          — (auth required) fetch or generate the caller's calendar token
 * POST /api/calendar/token/regenerate — (auth required) rotate the caller's calendar token
 * GET /api/calendar/:calendarToken.ics?roomId=&userId= — public ICS feed (token IS the auth)
 */

const express = require("express");
const ical = require("ical-generator").default;
const prisma = require("../lib/prisma");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

// ---------------------------------------------------------------------------
// GET /api/calendar/token
// ---------------------------------------------------------------------------
router.get("/token", authenticate, async (req, res, next) => {
  try {
    let user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(401).json({ error: "User not found." });

    if (!user.calendarToken) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { calendarToken: crypto.randomUUID() },
      });
    }

    res.json({ token: user.calendarToken });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/calendar/token/regenerate
// ---------------------------------------------------------------------------
router.post("/token/regenerate", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { calendarToken: crypto.randomUUID() },
    });

    res.json({ token: user.calendarToken });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/calendar/:calendarToken.ics
// ---------------------------------------------------------------------------
router.get("/:calendarTokenFile", async (req, res, next) => {
  try {
    const { calendarTokenFile } = req.params;

    // Strip the .ics extension
    if (!calendarTokenFile.endsWith(".ics")) {
      return res.status(404).json({ error: "Not found." });
    }
    const calendarToken = calendarTokenFile.slice(0, -4);

    const { roomId, userId: targetUserIdParam, from, to } = req.query;
    if (!roomId) return res.status(400).json({ error: "roomId query parameter is required." });

    // Authenticate via token
    const tokenUser = await prisma.user.findUnique({ where: { calendarToken } });
    if (!tokenUser) return res.status(401).json({ error: "Invalid calendar token." });

    // Resolve target user (default to token owner)
    const targetUserId = targetUserIdParam || tokenUser.id;

    // Verify token owner is a member of the room
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: true },
    });

    if (!room) {
      // Room deleted — signal calendar apps to remove subscription
      return res.status(410).end();
    }

    const ownerMembership = room.members.find((m) => m.userId === tokenUser.id);
    if (!ownerMembership) {
      // Token owner removed from room — signal calendar apps to remove subscription
      return res.status(410).end();
    }

    // Verify target user is also a member (when different from token owner)
    if (targetUserId !== tokenUser.id) {
      const targetMembership = room.members.find((m) => m.userId === targetUserId);
      if (!targetMembership) {
        return res.status(403).json({ error: "Target user is not a member of this room." });
      }
    }

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) return res.status(404).json({ error: "Target user not found." });

    // Fetch assignments for target user in this room, optionally filtered by date range
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        roomId,
        userId: targetUserId,
        ...(from && { date: { gte: from } }),
        ...(to && { date: { lte: to } }),
      },
      include: { timeBlock: true, shiftLocation: true },
    });

    // Build ICS
    const calendar = ical({
      name: `${room.name} - ${targetUser.name}`,
    });

    calendar.x([{ key: "X-PUBLISHED-TTL", value: "PT12H" }]);

    for (const assignment of assignments) {
      const { date, timeBlock, shiftLocation } = assignment;

      // Parse "YYYY-MM-DD" and "HH:MM" into Date objects
      const [year, month, day] = date.split("-").map(Number);
      const [startHour, startMin] = timeBlock.startTime.split(":").map(Number);
      const [endHour, endMin] = timeBlock.endTime.split(":").map(Number);

      const startDate = new Date(year, month - 1, day, startHour, startMin, 0);
      const endDate = new Date(year, month - 1, day, endHour, endMin, 0);

      // Handle overnight shifts (end time < start time)
      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const event = calendar.createEvent({
        summary: `${timeBlock.name} @ ${shiftLocation.name}`,
        start: startDate,
        end: endDate,
        location: shiftLocation.name,
      });
      event.uid(`assignment-${assignment.id}@shiftmanagement`);
    }

    res.set("Content-Type", "text/calendar; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="shifts.ics"');
    res.set("Cache-Control", "public, max-age=3600");
    res.send(calendar.toString());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
