/**
 * @file types/index.ts
 * @description Core TypeScript interfaces for the Shift Management application.
 */

export type UserRole = 'ADMIN' | 'PARTICIPANT';

export interface AuthUser {
  userId: string;
  name: string;
}

export interface User {
  id: string;
  name: string;
}

export interface Room {
  id: string;
  number: number;
  name: string;
  created_at: string;
}

export interface TimeBlock {
  id: string;
  room_id: string;
  name: string;
  start_time: string;  // "HH:MM"
  end_time: string;    // "HH:MM"
}

export interface RoomDetail extends Room {
  members: RoomMember[];
  locations: ShiftLocation[];
  time_blocks: TimeBlock[];
}

export interface RoomMember {
  room_id: string;
  user_id: string;
  role: UserRole;
  user?: User;
}

export interface ShiftLocation {
  id: string;
  room_id: string;
  name: string;
}

export interface ShiftAssignment {
  id: string;
  room_id: string;
  time_block_id: string;
  shift_location_id: string;
  user_id: string;
  date: string;  // "YYYY-MM-DD"
  user?: User;
  location?: ShiftLocation;
  time_block?: TimeBlock;
}

export interface FullSchedule {
  locations: ShiftLocation[];
  time_blocks: TimeBlock[];
  assignments: ShiftAssignment[];
}
