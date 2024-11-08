'use server'
import ScheduleEntry from '../models/scheduleEntry';
import { IScheduleEntry } from '../../interfaces/schedule.interfaces';
import { getCurrentUser } from './user-actions/userActions';

export type ScheduleActionResult<T> = 
  | { success: true; entries: T; error?: never }
  | { success: false; error: string; entries?: never }

export async function getScheduleEntries(start: Date, end: Date): Promise<ScheduleActionResult<IScheduleEntry[]>> {
  try {
    const entries = await ScheduleEntry.getAll(start, end);
    return { success: true, entries };
  } catch (error) {
    console.error('Error fetching schedule entries:', error);
    return { success: false, error: 'Failed to fetch schedule entries' };
  }
}

export async function getScheduleEntriesByUser(start: Date, end: Date, userId: string): Promise<ScheduleActionResult<IScheduleEntry[]>> {
  try {
    const entries = await ScheduleEntry.getAll(start, end);
    const userEntries = entries.filter(entry => entry.user_id === userId);
    return { success: true, entries: userEntries };
  } catch (error) {
    console.error('Error fetching user schedule entries:', error);
    return { success: false, error: 'Failed to fetch user schedule entries' };
  }
}

export async function getCurrentUserScheduleEntries(start: Date, end: Date): Promise<ScheduleActionResult<IScheduleEntry[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'No authenticated user found' };
    }
    return getScheduleEntriesByUser(start, end, user.user_id);
  } catch (error) {
    console.error('Error fetching current user schedule entries:', error);
    return { success: false, error: 'Failed to fetch current user schedule entries' };
  }
}

export async function addScheduleEntry(entry: Omit<IScheduleEntry, 'entry_id' | 'created_at' | 'updated_at' | 'tenant'>, options?: { useCurrentUser?: boolean }) {
  try {
    const createdEntry = await ScheduleEntry.create(entry, options);
    return { success: true, entry: createdEntry };
  } catch (error) {
    console.error('Error creating schedule entry:', error);
    return { success: false, error: 'Failed to create schedule entry' };
  }
}

export async function updateScheduleEntry(entry_id: string, entry: Partial<IScheduleEntry>) {
  try {
    const updatedEntry = await ScheduleEntry.update(entry_id, entry);
    return { success: true, entry: updatedEntry };
  } catch (error) {
    console.error('Error updating schedule entry:', error);
    return { success: false, error: 'Failed to update schedule entry' };
  }
}

export async function deleteScheduleEntry(entry_id: string) {
  try {
    const success = await ScheduleEntry.delete(entry_id);
    return { success };
  } catch (error) {
    console.error('Error deleting schedule entry:', error);
    return { success: false, error: 'Failed to delete schedule entry' };
  }
}
