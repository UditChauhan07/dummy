'use server'

import { ITimeEntry, ITimeSheetApproval, ITimeSheetComment, TimeSheetStatus, ITimePeriod, ITimeSheet } from '@/interfaces';
import { createTenantKnex } from '@/lib/db';
import TimeSheetComment from '@/interfaces/timeSheetComment';
import { formatISO } from 'date-fns';
import { timeSheetApprovalSchema, timeSheetCommentSchema, timeEntrySchema, timeSheetSchema } from '../schemas/timeSheet.schemas';
import { WorkItemType } from '@/interfaces/workItem.interfaces';
import { validateArray, validateData } from '../utils/validation';

export async function fetchTimeSheetsForApproval(teamIds: string[]): Promise<ITimeSheetApproval[]> {
  try {
    const {knex: db} = await createTenantKnex();
    const timeSheets = await db('time_sheets')
      .join('users', 'time_sheets.user_id', 'users.user_id')
      .join('team_members', 'users.user_id', 'team_members.user_id')
      .join('time_periods', 'time_sheets.period_id', 'time_periods.period_id')
      .whereIn('team_members.team_id', teamIds)
      .whereIn('time_sheets.approval_status', ['SUBMITTED', 'CHANGES_REQUESTED'])
      .select(
        'time_sheets.*',
        'users.user_id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'time_periods.start_date as period_start_date',
        'time_periods.end_date as period_end_date'
      );

    const timeSheetIds = timeSheets.map((sheet): string => sheet.id);
    const comments = await db('time_sheet_comments')
      .whereIn('time_sheet_id', timeSheetIds)
      .join('users', 'time_sheet_comments.user_id', 'users.user_id')
      .select(
        'time_sheet_comments.*',
        'users.first_name as commenter_first_name',
        'users.last_name as commenter_last_name'
      )
      .orderBy('time_sheet_comments.created_at', 'desc');

    const commentsByTimeSheet = comments.reduce((acc, comment) => {
      if (!acc[comment.time_sheet_id]) {
        acc[comment.time_sheet_id] = [];
      }
      acc[comment.time_sheet_id].push({
        ...comment,
        user_name: `${comment.commenter_first_name} ${comment.commenter_last_name}`
      });
      return acc;
    }, {} as Record<string, ITimeSheetComment[]>);

    const timeSheetApprovals: ITimeSheetApproval[] = timeSheets.map((sheet): ITimeSheetApproval => ({
      id: sheet.id,
      user_id: sheet.user_id,
      period_id: sheet.period_id,
      approval_status: sheet.approval_status,
      submitted_at: sheet.submitted_at ? formatISO(new Date(sheet.submitted_at)) : undefined,
      approved_at: sheet.approved_at ? formatISO(new Date(sheet.approved_at)) : undefined,
      approved_by: sheet.approved_by || undefined,
      employee_name: `${sheet.first_name} ${sheet.last_name}`,
      employee_email: sheet.email,
      comments: commentsByTimeSheet[sheet.id] || [],
      time_period: {
        start_date: formatISO(new Date(sheet.period_start_date)),
        end_date: formatISO(new Date(sheet.period_end_date)),
        period_id: sheet.period_id
      } as ITimePeriod,
      tenant: sheet.tenant
    }));

    return validateArray(timeSheetApprovalSchema, timeSheetApprovals);
  } catch (error) {
    console.error('Error fetching time sheets for approval:', error);
    throw new Error('Failed to fetch time sheets for approval');
  }
}

export async function addCommentToTimeSheet(
  timeSheetId: string,
  userId: string,
  comment: string,
  isApprover: boolean
): Promise<ITimeSheetComment> {
  try {
    const {knex: db, tenant} = await createTenantKnex();
    const [newComment] = await db('time_sheet_comments')
      .insert({
        time_sheet_id: timeSheetId,
        user_id: userId,
        comment: comment,
        is_approver: isApprover,
        created_at: db.fn.now(),
        tenant: tenant
      })
      .returning('*');

    return validateData(timeSheetCommentSchema, newComment);
  } catch (error) {
    console.error('Failed to add comment to time sheet:', error);
    throw new Error('Failed to add comment to time sheet');
  }
}

export async function bulkApproveTimeSheets(timeSheetIds: string[], managerId: string) {
  try {
    const {knex: db} = await createTenantKnex();
    await db.transaction(async (trx) => {
      for (const id of timeSheetIds) {
        const timeSheet = await trx('time_sheets')
          .where('id', id)
          .where('approval_status', 'SUBMITTED')
          .first();

        if (!timeSheet) {
          throw new Error(`Time sheet ${id} is not in a submitted state or does not exist`);
        }

        const isManager = await trx('teams')
          .join('team_members', 'teams.team_id', 'team_members.team_id')
          .where('team_members.user_id', timeSheet.user_id)
          .where('teams.manager_id', managerId)
          .first();

        if (!isManager) {
          throw new Error(`Unauthorized: Not a manager for time sheet ${id}`);
        }

        await trx('time_sheets')
          .where('id', id)
          .update({
            approval_status: 'APPROVED',
            approved_by: managerId,
            approved_at: new Date()
          });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Error bulk approving time sheets:', error);
    throw new Error('Failed to bulk approve time sheets');
  }
}

export async function fetchTimeSheet(timeSheetId: string): Promise<ITimeSheet> {
  try {
    const {knex: db} = await createTenantKnex();
    const timeSheet = await db('time_sheets')
      .join('time_periods', 'time_sheets.period_id', 'time_periods.period_id') 
      .where('time_sheets.id', timeSheetId)
      .select(
        'time_sheets.*',
        'time_periods.start_date as period_start_date',
        'time_periods.end_date as period_end_date',
        'time_periods.period_id'
      )
      .first();

    if (!timeSheet) {
      throw new Error(`Time sheet with id ${timeSheetId} not found`);
    }

    const result = {
      ...timeSheet,
      submitted_at: timeSheet.submitted_at ? formatISO(new Date(timeSheet.submitted_at)) : undefined,
      approved_at: timeSheet.approved_at ? formatISO(new Date(timeSheet.approved_at)) : undefined,
      approved_by: timeSheet.approved_by || undefined,
      time_period: {
        start_date: formatISO(new Date(timeSheet.period_start_date)),
        end_date: formatISO(new Date(timeSheet.period_end_date)),
        period_id: timeSheet.period_id
      }
    };

    return validateData(timeSheetSchema, result);
  } catch (error) {
    console.error('Error fetching time sheet:', error);
    throw new Error('Failed to fetch time sheet');
  }
}


export async function fetchTimeEntriesForTimeSheet(timeSheetId: string): Promise<ITimeEntry[]> {
  try {
    const {knex: db} = await createTenantKnex();
    const timeEntries = await db<ITimeEntry>('time_entries')
      .where({ time_sheet_id: timeSheetId })
      .select(
        'entry_id',
        'work_item_id',
        'work_item_type',
        'start_time',
        'end_time',
        'created_at',
        'updated_at',
        'billable_duration',
        'notes',
        'user_id',
        'time_sheet_id',
        'approval_status',
        'tenant'
      )
      .orderBy('start_time', 'asc');

    const formattedEntries = timeEntries.map((entry):ITimeEntry => ({
      ...entry,
      work_item_type: entry.work_item_type as WorkItemType,
      start_time: formatISO(entry.start_time),
      end_time: formatISO(entry.end_time),
      created_at: formatISO(entry.created_at),
      updated_at: formatISO(entry.updated_at)
    }));

    return validateArray(timeEntrySchema, formattedEntries);
  } catch (error) {
    console.error('Error fetching time entries for time sheet:', error);
    throw new Error('Failed to fetch time entries for time sheet');
  }
}

export async function fetchTimeSheetComments(timeSheetId: string): Promise<ITimeSheetComment[]> {
  console.log(`Fetching time sheet comments for timeSheetId: ${timeSheetId}`);
  try {
    console.log('Calling TimeSheetComment.getByTimeSheetId...');
    const timeSheetApprovals = await TimeSheetComment.getByTimeSheetId(timeSheetId);

    console.log('Processing time sheet approvals to extract comments...');
    if (!timeSheetApprovals || !timeSheetApprovals.comments) {
      console.log('No time sheet approval or comments found');
      return [];
    }
    console.log(`Processing approval for employee: ${timeSheetApprovals.employee_name}`);
    const comments = timeSheetApprovals.comments.map((comment): ITimeSheetComment => {
      console.log(`Processing comment: ${comment.comment_id}`);
      return {
        comment_id: comment.comment_id,
        time_sheet_id: timeSheetId,
        user_id: comment.user_id,
        comment: comment.comment,
        created_at: comment.created_at,
        is_approver: comment.is_approver,
        user_name: comment.user_name || `${timeSheetApprovals.employee_name} (${timeSheetApprovals.employee_email})`,
        tenant: comment.tenant
      };
    });

    console.log(`Processed ${comments.length} comments in total`);
    return validateArray(timeSheetCommentSchema, comments);
  } catch (error) {
    console.error('Error fetching time sheet comments:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

export async function approveTimeSheet(timeSheetId: string, approverId: string): Promise<void> {
  try {
    const {knex: db, tenant} = await createTenantKnex();
    await db.transaction(async (trx) => {
      const timeSheet = await trx('time_sheets')
        .where({ id: timeSheetId })
        .first();

      if (!timeSheet) {
        throw new Error('Time sheet not found');
      }

      await trx('time_sheets')
        .where({ id: timeSheetId })
        .update({
          approval_status: 'APPROVED' as TimeSheetStatus,
          approved_at: trx.fn.now(),
          approved_by: approverId
        });

      await trx('time_sheet_comments').insert({
        time_sheet_id: timeSheetId,
        user_id: approverId,
        comment: 'Time sheet approved',
        created_at: trx.fn.now(),
        is_approver: true,
        tenant
      });
    });
  } catch (error) {
    console.error('Error approving time sheet:', error);
    throw new Error('Failed to approve time sheet');
  }
}

export async function requestChangesForTimeSheet(timeSheetId: string, approverId: string): Promise<void> {
  try {
    const {knex: db, tenant} = await createTenantKnex();
    await db.transaction(async (trx) => {
      const timeSheet = await trx('time_sheets')
        .where({ id: timeSheetId })
        .first();

      if (!timeSheet) {
        throw new Error('Time sheet not found');
      }

      await trx('time_sheets')
        .where({ id: timeSheetId })
        .update({
          approval_status: 'CHANGES_REQUESTED' as TimeSheetStatus,
          approved_at: null,
          approved_by: null
        });

      await trx('time_sheet_comments').insert({
        time_sheet_id: timeSheetId,
        user_id: approverId,
        comment: 'Changes requested for time sheet',
        created_at: trx.fn.now(),
        is_approver: true,
        tenant
      });
    });
  } catch (error) {
    console.error('Error requesting changes for time sheet:', error);
    throw new Error('Failed to request changes for time sheet');
  }
}
