// src/components/TimeTracking.tsx
'use client';

import { useState, useEffect } from 'react';
import { TimeSheet } from './TimeSheet';
import { TimePeriodList } from './TimePeriodList';
import { ITimeSheet, ITimePeriodWithStatus, ITimeEntry } from '@/interfaces/timeEntry.interfaces';
import { IUser } from '@/interfaces';
import { fetchTimePeriods, fetchOrCreateTimeSheet, saveTimeEntry } from '@/lib/actions/timeEntryActions';
import { useTeamAuth } from '@/hooks/useTeamAuth';


interface TimeTrackingProps {
  currentUser: IUser;
  isManager: boolean;
}

export default function TimeTracking({ currentUser, isManager }: TimeTrackingProps) {
  const [timePeriods, setTimePeriods] = useState<ITimePeriodWithStatus[]>([]);
  const [selectedTimeSheet, setSelectedTimeSheet] = useState<ITimeSheet | null>(null);

  useEffect(() => {
    loadTimePeriods();
  }, [currentUser.user_id]);

  const loadTimePeriods = async () => {
    const periods = await fetchTimePeriods(currentUser.user_id);
    setTimePeriods(periods);
  };

  const handleSelectTimePeriod = async (timePeriod: ITimePeriodWithStatus) => {
    const timeSheet = await fetchOrCreateTimeSheet(currentUser.user_id, timePeriod.period_id);
    setSelectedTimeSheet(timeSheet);
  };

  const handleSaveTimeEntry = async (timeEntry: ITimeEntry) => {
    try {
      console.log('Saving time entry:', timeEntry);
      timeEntry.time_sheet_id = selectedTimeSheet?.id;
      const savedTimeEntry = await saveTimeEntry(timeEntry);
      console.log('Time entry saved successfully:', savedTimeEntry);

      // Optionally, update the local state or refresh the time entries
      // For example, you might want to refresh the entire time sheet
      if (selectedTimeSheet) {
        const updatedTimeSheet = await fetchOrCreateTimeSheet(currentUser.user_id, selectedTimeSheet.period_id);
        setSelectedTimeSheet(updatedTimeSheet);
      }

      // You can also add some user feedback here, like a toast notification
    } catch (error) {
      console.error('Error saving time entry:', error);
      // Handle the error (e.g., show an error message to the user)
    }
  };

  const handleSubmitTimeSheet = async () => {
    // Implement submit logic
  };

  const handleBack = () => {
    setSelectedTimeSheet(null);
  };

  if (selectedTimeSheet) {
    return (
      <TimeSheet
        timeSheet={selectedTimeSheet}
        onSaveTimeEntry={handleSaveTimeEntry}
        isManager={isManager}
        onSubmitTimeSheet={handleSubmitTimeSheet}
        onBack={handleBack}
      />
    );
  }

  return <TimePeriodList timePeriods={timePeriods} onSelectTimePeriod={handleSelectTimePeriod} />;
}
