'use server'
import { createTenantKnex } from '@/lib/db';
import { IServiceCategory } from '@/interfaces/billing.interfaces';
import { ITicketCategory } from '@/interfaces/ticket.interfaces';

export async function getServiceCategories(): Promise<IServiceCategory[]> {
  try {
    const {knex: db} = await createTenantKnex();
    const categories = await db('service_categories')
      .select('category_id', 'category_name', 'description');

    return categories;
  } catch (error) {
    console.error('Error fetching service categories:', error);
    throw new Error('Failed to fetch service categories');
  }
}

export async function getTicketCategoriesByChannel(channelId: string): Promise<ITicketCategory[]> {
  try {
    const {knex: db, tenant} = await createTenantKnex();
    if (!tenant) {
      throw new Error('Tenant not found');
    }

    const categories = await db('categories')
      .where({
        channel_id: channelId,
        tenant: tenant
      })
      .orderBy('category_name', 'asc');

    return categories;
  } catch (error) {
    console.error('Error fetching ticket categories:', error);
    throw new Error('Failed to fetch ticket categories');
  }
}
