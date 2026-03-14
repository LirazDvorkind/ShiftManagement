/**
 * @file lib/api.ts
 * @description Centralized API utility for Shift Management.
 */

import { 
  Room, 
  RoomMember, 
  ShiftLocation, 
  ShiftTime, 
  ShiftAssignment, 
  FullSchedule,
  UserRole,
  ShiftType
} from '../types';

const API_BASE_URL = '/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
    throw new Error(error.message || `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  /**
   * Room Management
   */
  createRoom: (name: string) => 
    fetcher<Room>('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),

  getRoom: (id: string) => 
    fetcher<Room>(`/rooms/${id}`),

  joinRoom: (id: string) => 
    fetcher<void>(`/rooms/${id}/join`, { method: 'POST' }),

  updateMemberRole: (roomId: string, userId: string, role: UserRole) => 
    fetcher<void>(`/rooms/${roomId}/members/${userId}/role`, { 
      method: 'PUT', 
      body: JSON.stringify({ role }) 
    }),

  /**
   * Admin Controls
   */
  addLocation: (roomId: string, name: string) => 
    fetcher<ShiftLocation>(`/rooms/${roomId}/locations`, { 
      method: 'POST', 
      body: JSON.stringify({ name }) 
    }),

  addShiftTime: (roomId: string, type: ShiftType, date: string) => 
    fetcher<ShiftTime>(`/rooms/${roomId}/times`, { 
      method: 'POST', 
      body: JSON.stringify({ type, date }) 
    }),

  assignShift: (roomId: string, data: { shift_time_id: string; shift_location_id: string; user_id: string }) => 
    fetcher<ShiftAssignment>(`/rooms/${roomId}/assignments`, { 
      method: 'POST', 
      body: JSON.stringify(data) 
    }),

  /**
   * Schedule
   */
  getSchedule: (roomId: string) => 
    fetcher<FullSchedule>(`/rooms/${roomId}/schedule`),
};
