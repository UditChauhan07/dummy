import { Knex } from 'knex';
import { IStatus } from '../../interfaces/project.interfaces';
import { createTenantKnex } from '../db';

const Status = {
  getAll: async (): Promise<IStatus[]> => {
    try {
      const {knex: db} = await createTenantKnex();
      const statuses = await db<IStatus>('statuses').select('*');
      console.log(statuses);
      return statuses;
    } catch (error) {
      console.error('Error getting all statuses:', error);
      throw error;
    }
  },

  get: async (id: string, trx?: Knex.Transaction): Promise<IStatus | undefined> => {
    const {knex: db} = await createTenantKnex();
    const queryBuilder = trx || db;
    try {
      const status = await queryBuilder<IStatus>('statuses').select('*').where({ status_id: id }).first();
      return status;
    } catch (error) {
      console.error(`Error getting status with id ${id}:`, error);
      throw error;
    }
  },

  insert: async (status: Omit<IStatus, 'tenant'>, trx?: Knex.Transaction): Promise<Pick<IStatus, "status_id">> => {
    const {knex: db, tenant} = await createTenantKnex();
    const queryBuilder = trx || db;
    try {
      const [insertedStatus] = await queryBuilder<IStatus>('statuses').insert({...status, tenant: tenant!}).returning('status_id');
      return { status_id: insertedStatus.status_id };
    } catch (error) {
      console.error('Error inserting status:', error);
      throw error;
    }
  },

  update: async (id: string, status: Partial<IStatus>): Promise<IStatus> => {
    const {knex: db} = await createTenantKnex();
    try {
      await db<IStatus>('statuses').where({ status_id: id }).update(status);
      const query = db<IStatus>('statuses').where({ status_id: id });
      console.log('DEBUG query:', query.toSQL().sql);
      const updatedStatus = await query.first();
      if (!updatedStatus) {
        throw new Error(`Status with id ${id} not found after update`);
      }
      return updatedStatus;
    } catch (error) {
      console.error(`Error updating status with id ${id}:`, error);
      throw error;
    }
  },

  delete: async (id: string): Promise<void> => {
    try {
      const {knex: db} = await createTenantKnex();
      await db<IStatus>('statuses').where({ status_id: id }).del();
    } catch (error) {
      console.error(`Error deleting status with id ${id}:`, error);
      throw error;
    }
  },

  getMaxOrderNumber: async (trx?: Knex.Transaction): Promise<number> => {
    const {knex: db} = await createTenantKnex();
    const queryBuilder = trx || db;
    try {
      // Build the query
      const query = queryBuilder('statuses')
        .max('order_number as maxOrder')
        .where('item_type', 'ticket');

      // Execute the query
      const result = await query.first<{ maxOrder: number | null }>();

      console.log('DEBUG result:', result);

      if (!result || result.maxOrder === null) {
        return 0;
      }

      return result.maxOrder;
    } catch (error) {
      console.error('Error getting max order number:', error);
      throw error;
    }
  },
};

export default Status;
