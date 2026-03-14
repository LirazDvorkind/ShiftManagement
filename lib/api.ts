/**
 * @file lib/api.ts
 * @description Centralized API client for Shift Management.
 */

import {
  AuthUser,
  Room,
  RoomDetail,
  RoomMember,
  ShiftLocation,
  TimeBlock,
  ShiftAssignment,
  FullSchedule,
  UserRole,
} from '../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('sm_token');
}

async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, body.error || body.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export const auth = {
  /** Find or create a user by name, returns a JWT. */
  session: (name: string) =>
    fetcher<{ token: string; user: AuthUser }>('/auth/session', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
};

export const manager = {
  getRooms: (password: string) =>
    fetcher<{ id: string; number: number; name: string; created_at: string; members: { user_id: string; name: string; role: string }[] }[]>(
      '/manager/rooms',
      { headers: { 'x-manager-key': password } },
    ),

  deleteRoom: (password: string, roomId: string) =>
    fetcher<{ message: string }>(`/manager/rooms/${roomId}`, {
      method: 'DELETE',
      headers: { 'x-manager-key': password },
    }),
};

export const api = {
  createRoom: (number: number) =>
    fetcher<Room>('/rooms', { method: 'POST', body: JSON.stringify({ number }) }),

  getRoom: (id: string) =>
    fetcher<RoomDetail>(`/rooms/${id}`),

  deleteRoom: (id: string) =>
    fetcher<{ message: string }>(`/rooms/${id}`, { method: 'DELETE' }),

  joinRoom: (id: string) =>
    fetcher<RoomMember>(`/rooms/${id}/join`, { method: 'POST' }),

  addMember: (roomId: string, name: string) =>
    fetcher<RoomMember>(`/rooms/${roomId}/members`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  renameMember: (roomId: string, userId: string, name: string) =>
    fetcher<{ user_id: string; name: string }>(`/rooms/${roomId}/members/${userId}/name`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  updateMemberRole: (roomId: string, userId: string, role: UserRole) =>
    fetcher<RoomMember>(`/rooms/${roomId}/members/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  removeMember: (roomId: string, userId: string) =>
    fetcher<{ message: string }>(`/rooms/${roomId}/members/${userId}`, { method: 'DELETE' }),

  addLocation: (roomId: string, name: string) =>
    fetcher<ShiftLocation>(`/rooms/${roomId}/locations`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  renameLocation: (roomId: string, locationId: string, name: string) =>
    fetcher<ShiftLocation>(`/rooms/${roomId}/locations/${locationId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  removeLocation: (roomId: string, locationId: string) =>
    fetcher<{ message: string }>(`/rooms/${roomId}/locations/${locationId}`, {
      method: 'DELETE',
    }),

  addTimeBlock: (roomId: string, name: string, startTime: string, endTime: string) =>
    fetcher<TimeBlock>(`/rooms/${roomId}/time-blocks`, {
      method: 'POST',
      body: JSON.stringify({ name, start_time: startTime, end_time: endTime }),
    }),

  renameTimeBlock: (roomId: string, blockId: string, name: string) =>
    fetcher<TimeBlock>(`/rooms/${roomId}/time-blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  removeTimeBlock: (roomId: string, blockId: string) =>
    fetcher<{ message: string }>(`/rooms/${roomId}/time-blocks/${blockId}`, {
      method: 'DELETE',
    }),

  assignShift: (
    roomId: string,
    data: { time_block_id: string; shift_location_id: string; user_id: string; date: string },
  ) =>
    fetcher<ShiftAssignment>(`/rooms/${roomId}/assignments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeAssignment: (roomId: string, assignmentId: string) =>
    fetcher<{ message: string }>(`/rooms/${roomId}/assignments/${assignmentId}`, {
      method: 'DELETE',
    }),

  getSchedule: (roomId: string) =>
    fetcher<FullSchedule>(`/rooms/${roomId}/schedule`),
};
