import { ITimePeriodSettings } from '@/interfaces/timeEntry.interfaces';
import { createTenantKnex } from '@/lib/db';
import { ISO8601String } from '@/types/types.d';
import { format, fromZonedTime, toZonedTime,  } from 'date-fns-tz';

export class TimePeriodSettings {
  static async getActiveSettings(): Promise<ITimePeriodSettings[]> {
    const {knex: db} = await createTenantKnex();
    const settings = await db<ITimePeriodSettings>('time_period_settings')
      .where('is_active', true)
      .orderBy('effective_from', 'desc');

    return settings.map((setting):ITimePeriodSettings => ({
      ...setting,
      effective_from: this.toISO8601(setting.effective_from),
      effective_to: setting.effective_to ? this.toISO8601(setting.effective_to) : undefined,
      created_at: this.toISO8601(setting.created_at),
      updated_at: this.toISO8601(setting.updated_at)
    }));
  }

  private static toISO8601(date: Date | string): ISO8601String {
    if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return format(toZonedTime(date, 'UTC'), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'") as ISO8601String;
  }
}
