/**
 * @file types/index.ts
 * @description Core TypeScript interfaces for the Shift Management application.
 */

export type UserRole = 'ADMIN' | 'PARTICIPANT';
export type ShiftType = 'MORNING' | 'EVENING' | 'NIGHT';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Room {
  id: string;
  name: string;
  created_at: string;
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

export interface ShiftTime {
  id: string;
  room_id: string;
  type: ShiftType;
  date: string;
}

export interface ShiftAssignment {
  id: string;
  room_id: string;
  shift_time_id: string;
  shift_location_id: string;
  user_id: string;
  user?: User;
  location?: ShiftLocation;
  time?: ShiftTime;
}

export interface ScheduleEntry {
  location_id: string;
  time_id: string;
  assignments: ShiftAssignment[];
}

export interface FullSchedule {
  locations: ShiftLocation[];
  times: ShiftTime[];
  assignments: ShiftAssignment[];
}
