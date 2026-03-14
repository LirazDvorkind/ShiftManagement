/**
 * @file components/ScheduleView.tsx
 * @description Visual grid displaying the shift schedule.
 */

import { FullSchedule, ShiftAssignment } from '@/types';
import { Calendar as CalendarIcon, MapPin, User } from 'lucide-react';

interface ScheduleViewProps {
  schedule: FullSchedule;
}

export default function ScheduleView({ schedule }: ScheduleViewProps) {
  const { locations, times, assignments } = schedule;

  const getAssignments = (locationId: string, timeId: string) => {
    return assignments.filter(
      (a) => a.shift_location_id === locationId && a.shift_time_id === timeId
    );
  };

  if (locations.length === 0 || times.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-gray-200">
        <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No shifts or locations configured yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto bg-white rounded-xl border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Location / Time
            </th>
            {times.map((time) => (
              <th key={time.id} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">
                <div className="flex flex-col">
                  <span>{time.type}</span>
                  <span className="font-normal text-[10px] lowercase text-gray-400">{time.date}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {locations.map((location) => (
            <tr key={location.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                  {location.name}
                </div>
              </td>
              {times.map((time) => {
                const cellAssignments = getAssignments(location.id, time.id);
                return (
                  <td key={`${location.id}-${time.id}`} className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-2">
                      {cellAssignments.length > 0 ? (
                        cellAssignments.map((assignment) => (
                          <div 
                            key={assignment.id} 
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <User className="w-3 h-3 mr-1" />
                            {assignment.user?.name || 'Assigned'}
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-gray-300 italic">Unassigned</span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
