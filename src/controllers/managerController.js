/**
 * Manager controller
 *
 * Provides privileged operations accessible only with the manager password:
 *   - List all rooms with their members and roles
 *   - Delete a room (cascades to all related data)
 */

const prisma = require('../lib/prisma');

async function getAllRooms(req, res, next) {
  try {
    const rooms = await prisma.room.findMany({
      include: {
        members: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { role: 'asc' },
        },
      },
      orderBy: { number: 'asc' },
    });

    const result = rooms.map(room => ({
      id: room.id,
      number: room.number,
      name: room.name,
      created_at: room.createdAt,
      members: room.members.map(m => ({
        user_id: m.userId,
        name: m.user?.name ?? 'Unknown',
        role: m.role,
      })),
    }));

    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function deleteRoom(req, res, next) {
  const { id } = req.params;

  try {
    const room = await prisma.room.findUnique({ where: { id } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found.' });
    }

    await prisma.room.delete({ where: { id } });
    return res.status(200).json({ message: 'Room deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAllRooms, deleteRoom };
