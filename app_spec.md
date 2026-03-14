# Shift Management Web App - Architecture & Specification

## App Overview

A web application allowing users to create "Rooms" to manage team shifts. Each room has a unique ID and a shareable link. Users within a room have roles (Admin or Participant). Admins can configure locations, shift times, manage the participant list, and assign participants to specific shifts. Any user can create a new room.

## Core Features

- **Room Creation & Sharing:** Anyone can generate a new room. The creator automatically becomes the initial Admin. The room generates a unique URL/ID for sharing.
- **Role Management:** \* **Admin:** Can edit room details, add/remove locations, define shift times, add/remove participants, assign shifts, and grant Admin rights to other participants.
  - **Participant:** Can view the shift schedule and their own assignments.
- **Shift Configuration (Admin Only):**
  - Locations: Manual text input (e.g., "Main Office", "Warehouse").
  - Shift Times: Categorized broadly (Morning, Evening, Night) or specific time blocks.
- **Assignments (Admin Only):** Assigning a participant to a specific location and shift time.

## Data Models (Relational/Document representation)

- **User:** `id`, `name`, `email`, `password_hash`
- **Room:** `id` (UUID), `name`, `created_at`
- **RoomMember:** `room_id`, `user_id`, `role` (ENUM: 'ADMIN', 'PARTICIPANT')
- **ShiftLocation:** `id`, `room_id`, `name` (String)
- **ShiftTime:** `id`, `room_id`, `type` (ENUM: 'MORNING', 'EVENING', 'NIGHT'), `date`
- **ShiftAssignment:** `id`, `room_id`, `shift_time_id`, `shift_location_id`, `user_id`

## API Endpoints (RESTful)

- `POST /api/rooms` - Create a room
- `GET /api/rooms/:id` - Get room details (requires auth/membership)
- `POST /api/rooms/:id/join` - Join a room via share link
- `PUT /api/rooms/:id/members/:userId/role` - Update member role (Admin only)
- `POST /api/rooms/:id/locations` - Add location (Admin only)
- `POST /api/rooms/:id/times` - Add shift time (Admin only)
- `POST /api/rooms/:id/assignments` - Assign user to shift (Admin only)
- `GET /api/rooms/:id/schedule` - Fetch full compiled schedule

## General Requirements

- All code must be production-ready and optimized for direct copy-pasting.
- Include standard documentation and docstrings.
- Strictly exclude all conversational filler, pedagogical notes, and meta-commentary within the code blocks. Keep code clean and contiguous.
