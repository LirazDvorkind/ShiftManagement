/**
 * Manager routes (password-protected, no JWT required)
 *
 * GET    /api/manager/rooms        — list all rooms with members
 * DELETE /api/manager/rooms/:id   — delete a room
 */

const { Router } = require('express');
const managerAuth = require('../middleware/managerAuth');
const { getAllRooms, deleteRoom } = require('../controllers/managerController');

const router = Router();

router.use(managerAuth);

router.get('/rooms', getAllRooms);
router.delete('/rooms/:id', deleteRoom);

module.exports = router;
