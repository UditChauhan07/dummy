'use server'

import { revalidatePath } from 'next/cache'
import { TimePeriod } from '../models/timePeriod'
import { TimePeriodSettings } from '../models/timePeriodSettings';
import { v4 as uuidv4 } from 'uuid';
import { ISO8601String } from '../../types/types.d';
import { ITimePeriod, ITimePeriodSettings } from '../../interfaces/timeEntry.interfaces';
import { addDays, addMonths, format, differenceInHours, parseISO, startOfDay, formatISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { validateData, validateArray } from '../utils/validation';
import { timePeriodSchema, timePeriodSettingsSchema } from '../schemas/timeSheet.schemas';

export async function getLatestTimePeriod(): Promise<ITimePeriod | null> {
  try {
    const latestPeriod = await TimePeriod.getLatest();
    return latestPeriod ? validateData(timePeriodSchema, latestPeriod) : null;
  } catch (error) {
    console.error('Error fetching latest time period:', error)
    throw new Error('Failed to fetch latest time period')
  }
}

export async function getTimePeriodSettings(): Promise<ITimePeriodSettings[]> {
  try {
    const settings = await TimePeriodSettings.getActiveSettings();
    return validateArray(timePeriodSettingsSchema, settings);
  } catch (error) {
    console.error('Error fetching time period settings:', error);
    throw new Error('Failed to fetch time period settings');
  }
}

export async function createTimePeriod(
  timePeriodData: Omit<ITimePeriod, 'period_id' | 'tenant'>
): Promise<ITimePeriod> {
  console.log('Starting createTimePeriod function with data:', timePeriodData);
  try {
    console.log('Fetching active time period settings...');
    const settings = await TimePeriodSettings.getActiveSettings();
    const validatedSettings = validateArray(timePeriodSettingsSchema, settings);
    console.log('Active settings fetched:', validatedSettings);

    const activeSetting = validatedSettings[0];
    console.log('Using active setting:', activeSetting);

    console.log('No overlapping periods found.');

    console.log('Creating new time period...');
    const timePeriod = await TimePeriod.create(timePeriodData);
    const validatedPeriod = validateData(timePeriodSchema, timePeriod);
    console.log('New time period created:', validatedPeriod);
    console.log('Revalidating path: /msp/time-entry');
    revalidatePath('/msp/time-entry');

    console.log('createTimePeriod function completed successfully.');
    return validatedPeriod;
  } catch (error) {
    console.error('Error in createTimePeriod function:', error);
    throw error;
  }
}

export async function fetchAllTimePeriods(): Promise<ITimePeriod[]> {
  try {
    const timePeriods = await TimePeriod.getAll();
    
    const periods = timePeriods.map((period: ITimePeriod):ITimePeriod => ({
      ...period,
      start_date: formatISO(period.start_date),
      end_date: formatISO(period.end_date)
    }));

    return validateArray(timePeriodSchema, periods);
  } catch (error) {
    console.error('Error fetching all time periods:', error)
    throw new Error('Failed to fetch time periods')
  }
}

// Utility function to get current date as ISO8601 string
function getCurrentDateISO(): ISO8601String {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  const milliseconds = String(now.getUTCMilliseconds()).padStart(3, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
}

export async function getCurrentTimePeriod(): Promise<ITimePeriod | null> {
  try {
    const currentDate = getCurrentDateISO();
    const currentPeriod = await TimePeriod.findByDate(currentDate);
    return currentPeriod ? validateData(timePeriodSchema, currentPeriod) : null;
  } catch (error) {
    console.error('Error fetching current time period:', error)
    throw new Error('Failed to fetch current time period')
  }
}

// Modify the generateTimePeriods function
export async function generateTimePeriods(
  settings: ITimePeriodSettings[],
  startDateStr: ISO8601String,
  endDateStr: ISO8601String
): Promise<ITimePeriod[]> {
  const periods: ITimePeriod[] = [];

  for (const setting of settings) {
    let currentDateStr = startDateStr;

    if (currentDateStr < setting.effective_from) {
      currentDateStr = setting.effective_from;
    }

    // Align currentDate to the next occurrence of start_day if provided
    if (setting.start_day !== undefined && setting.frequency_unit !== 'year') {
      switch (setting.frequency_unit) {
        case 'week':
          currentDateStr = alignToWeekday(currentDateStr, setting.start_day);
          break;
        case 'month':
          currentDateStr = alignToMonthDay(currentDateStr, setting.start_day);
          break;
      }
    }

    let finished = false;
    while (currentDateStr < endDateStr) {
      if (setting.effective_to && currentDateStr > setting.effective_to) {
        break;
      }

      let periodStartStr = currentDateStr;
      let periodEndStr: ISO8601String;

      const frequency = setting.frequency || 1; // default to 1 if undefined

      switch (setting.frequency_unit) {
        case 'day':
          periodEndStr = addDaysToISOString(periodStartStr, frequency - 1);
          break;

        case 'week':
          periodEndStr = addDaysToISOString(periodStartStr, (frequency * 7) - 1);
          if (setting.end_day !== undefined) {
            periodEndStr = alignToWeekday(periodEndStr, setting.end_day);
            if (periodEndStr < periodStartStr) {
              periodEndStr = addDaysToISOString(periodEndStr, 7);
            }
          }
          break;

        case 'month':
          periodEndStr = addMonthsToISOString(periodStartStr, frequency);
          // periodEndStr = addDaysToISOString(periodEndStr, -1);
          if (setting.end_day !== undefined && setting.end_day > 0) {
            periodEndStr = alignToMonthDay(periodStartStr, setting.end_day);            
            if (periodEndStr < periodStartStr) {
              periodEndStr = addMonthsToISOString(periodEndStr, 1);
            }

            if (periodStartStr > endDateStr) {
              finished = true;
              break;
            }
            if (periodEndStr > endDateStr) {
              finished = true;
              break;
            }
            if (setting.effective_to && periodStartStr > setting.effective_to) {
              finished = true;
              break;
            }
            if (setting.effective_to && periodEndStr > setting.effective_to) {
              finished = true;
              break;
            }

            const newPeriod: ITimePeriod = {
              period_id: uuidv4(),
              start_date: alignToNearestMidnight(periodStartStr),
              end_date: alignToNearestMidnight(periodEndStr),
              tenant: setting.tenant_id,
            };
            periods.push(newPeriod);
      
            // Move currentDate forward
            currentDateStr = getFirstDayOfNextMonth(periodStartStr, frequency);
            continue;
          } else {
            periodEndStr = getFirstDayOfNextMonth(periodStartStr, frequency);
            periodEndStr = format(toZonedTime(periodEndStr, 'UTC'), "yyyy-MM-01'T'00:00:00'Z'") as ISO8601String;
            if (periodStartStr > endDateStr) {
              break;
            }
            if (periodEndStr > endDateStr) {
              break;
            }
            if (setting.effective_to && periodStartStr > setting.effective_to) {
              break;
            }
            if (setting.effective_to && periodEndStr > setting.effective_to) {
              break;
            }
      
            const newPeriod: ITimePeriod = {
              period_id: uuidv4(),
              start_date: alignToNearestMidnight(periodStartStr),
              end_date: alignToNearestMidnight(periodEndStr),
              tenant: setting.tenant_id,
            };
            periods.push(newPeriod);            
            periodEndStr = addMonthsToISOString(periodStartStr, 1);
            finished = true;
            break;
          }
          break;

        case 'year': {
          if (
            setting.start_month === undefined ||
            setting.start_day_of_month === undefined ||
            setting.end_month === undefined ||
            setting.end_day_of_month === undefined
          ) {
            throw new Error('start_month, start_day_of_month, end_month, end_day_of_month are required for yearly frequency.');
          }

          const startYear = parseInt(periodStartStr.substring(0, 4));
          periodStartStr = `${startYear}-${String(setting.start_month).padStart(2, '0')}-${String(setting.start_day_of_month).padStart(2, '0')}T00:00:00.000Z`;

          let endYear = startYear + frequency;
          periodEndStr = `${endYear}-${String(setting.end_month).padStart(2, '0')}-${String(setting.end_day_of_month).padStart(2, '0')}T23:59:59.999Z`;
          
          if (periodEndStr < periodStartStr) {
            endYear++;
            periodEndStr = `${endYear}-${String(setting.end_month).padStart(2, '0')}-${String(setting.end_day_of_month).padStart(2, '0')}T23:59:59.999Z`;
          }
          
          periodEndStr = adjustEndDateForMonth(periodEndStr);
          break;
        }

        default:
          throw new Error(`Unsupported frequency_unit: ${setting.frequency_unit}`);
      }

      if (finished) {
        break;
      }

      if (periodStartStr > endDateStr) {
        break;
      }
      if (periodEndStr > endDateStr) {
        break;
      }
      if (setting.effective_to && periodStartStr > setting.effective_to) {
        break;
      }
      if (setting.effective_to && periodEndStr > setting.effective_to) {
        break;
      }

      const newPeriod: ITimePeriod = {
        period_id: uuidv4(),
        start_date: alignToNearestMidnight(periodStartStr),
        end_date: alignToNearestMidnight(periodEndStr),
        tenant: setting.tenant_id,
      };
      periods.push(newPeriod);

      // Move currentDate forward
      currentDateStr = periodEndStr;
    }
  }

  return periods;
}

function getFirstDayOfNextMonth(dateStr: ISO8601String, monthsToAdvance: number = 1): ISO8601String {
  const date = new Date(dateStr);
  date.setUTCMonth(date.getUTCMonth() + monthsToAdvance, 1);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString() as ISO8601String;
}

// Helper function to align date to the next occurrence of a weekday
function alignToWeekday(dateStr: ISO8601String, targetDay: number): ISO8601String {
  const dayOfWeek = getDayOfWeek(dateStr);
  const daysToAdd = (targetDay - dayOfWeek + 7) % 7;
  return addDaysToISOString(dateStr, daysToAdd);
}

// Helper function to align date to the specified day of the month
function alignToMonthDay(dateStr: ISO8601String, targetDay: number): ISO8601String {
  const [year, month] = dateStr.split('-');
  let alignedDate = `${year}-${month}-${String(targetDay).padStart(2, '0')}T00:00:00Z`;

  if (alignedDate < dateStr) {
    // Move to next month
    alignedDate = addMonthsToISOString(alignedDate, 1);
  }

  const daysInMonth = getDaysInMonth(alignedDate);

  if (targetDay > daysInMonth) {
    // Set to last day of month
    alignedDate = `${year}-${month}-${String(daysInMonth).padStart(2, '0')}T00:00:00Z`;
  }

  return alignedDate as ISO8601String;
}

// Adjust end date to the last day of the month if necessary
function adjustEndDateForMonth(dateStr: ISO8601String): ISO8601String {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const daysInMonth = getDaysInMonth(dateStr);

  if (day > daysInMonth) {
    return `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}T23:59:59.999Z`;
  }

  return dateStr;
}

// Helper function to add days to an ISO8601 string
function addDaysToISOString(dateStr: ISO8601String, days: number): ISO8601String {
  const [datePart, timePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  
  let newYear = year;
  let newMonth = month;
  let newDay = day + days;

  while (newDay > getDaysInMonth(`${newYear}-${String(newMonth).padStart(2, '0')}-01T00:00:00Z`)) {
    newDay -= getDaysInMonth(`${newYear}-${String(newMonth).padStart(2, '0')}-01T00:00:00Z`);
    newMonth++;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
  }

  while (newDay < 1) {
    newMonth--;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    newDay += getDaysInMonth(`${newYear}-${String(newMonth).padStart(2, '0')}-01T00:00:00Z`);
  }
  
  return `${newYear}-${String(newMonth).padStart(2, '0')}-${String(newDay).padStart(2, '0')}T${timePart}`;
}

// Helper function to add months to an ISO8601 string
function addMonthsToISOString(dateStr: ISO8601String, months: number): ISO8601String {
  return format(toZonedTime(addMonths(dateStr, months), 'UTC'), "yyyy-MM-dd'T'HH:mm:ss'Z'") as ISO8601String;
}

// Helper function to get the day of the week (0-6, where 0 is Sunday)
function getDayOfWeek(dateStr: ISO8601String): number {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const a = Math.floor((14 - month) / 12);
  const y = year - a;
  const m = month + 12 * a - 2;
  return (day + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + Math.floor((31 * m) / 12)) % 7;
}

// Helper function to get the number of days in a month
function getDaysInMonth(dateStr: ISO8601String): number {
  const [year, month] = dateStr.split('-').map(Number);
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return daysInMonth[month - 1];
}

function alignToNearestMidnight(dateStr: ISO8601String): ISO8601String {
  const parsedDate = parseISO(dateStr);
  const previousMidnight = startOfDay(parsedDate);
  const nextMidnight = addDays(previousMidnight, 1);
  
  const hoursToPreviousMidnight = differenceInHours(parsedDate, previousMidnight);
  const hoursToNextMidnight = differenceInHours(nextMidnight, parsedDate);
  
  const nearestMidnight = hoursToPreviousMidnight <= hoursToNextMidnight ? previousMidnight : nextMidnight;
  
  return format(nearestMidnight, "yyyy-MM-dd'T'HH:mm:ss'Z'") as ISO8601String;
}

export async function generateAndSaveTimePeriods(startDate: ISO8601String, endDate: ISO8601String): Promise<ITimePeriod[]> {
  try {
    const settings = await getTimePeriodSettings();
    const validatedSettings = validateArray(timePeriodSettingsSchema, settings);
    const generatedPeriods = await generateTimePeriods(validatedSettings, startDate, endDate);

    // Save generated periods to the database
    const savedPeriods = await Promise.all(generatedPeriods.map((period: ITimePeriod): Promise<ITimePeriod> => TimePeriod.create(period)));
    const validatedPeriods = validateArray(timePeriodSchema, savedPeriods);

    revalidatePath('/msp/time-entry');
    return validatedPeriods;
  } catch (error) {
    console.error('Error generating and saving time periods:', error);
    throw new Error('Failed to generate and save time periods');
  }
}
