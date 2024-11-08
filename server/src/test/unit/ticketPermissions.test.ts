import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IUserWithRoles, IRole, IRoleWithPermissions, IPermission } from '../../interfaces/auth.interfaces';
import { ITicket } from '../../interfaces/ticket.interfaces';
import * as ticketActions from '../../lib/actions/ticket-actions/ticketActions';
import Ticket from '../../lib/models/ticket';

// Mock the Ticket model methods
vi.mock('../../lib/models/ticket', () => ({
  default: {
    getAll: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Ticket Permissions Unit Tests', () => {
  let viewTicketPermission: IPermission;
  let editTicketPermission: IPermission;
  let createTicketPermission: IPermission;
  let deleteTicketPermission: IPermission;
  let userRole: IRoleWithPermissions;
  let adminRole: IRoleWithPermissions;
  let regularUser: IUserWithRoles;
  let adminUser: IUserWithRoles;
  let mockTicket: ITicket;

  beforeEach(() => {
    // Create permissions
    viewTicketPermission = { permission_id: '1', resource: 'ticket', action: 'view' };
    editTicketPermission = { permission_id: '2', resource: 'ticket', action: 'edit' };
    createTicketPermission = { permission_id: '3', resource: 'ticket', action: 'create' };
    deleteTicketPermission = { permission_id: '4', resource: 'ticket', action: 'delete' };

    // Create roles
    userRole = {
      role_id: '1',
      role_name: 'User',
      description: 'Regular user role with view ticket permission',
      permissions: [viewTicketPermission]
    };

    adminRole = {
      role_id: '2',
      role_name: 'Admin',
      description: 'Administrator role with all ticket permissions',
      permissions: [viewTicketPermission, editTicketPermission, createTicketPermission, deleteTicketPermission]
    };

    // Create users
    regularUser = {
      user_id: '1',
      tenant: 'test-tenant',
      username: 'johndoe',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      hashed_password: 'hashed_password_here',
      roles: [userRole],
      is_inactive: false
    };

    adminUser = {
      user_id: '2',
      tenant: 'test-tenant',
      username: 'janeadmin',
      first_name: 'Jane',
      last_name: 'Admin',
      email: 'jane@example.com',
      hashed_password: 'hashed_password_here',
      roles: [adminRole],
      is_inactive: false
    };

    mockTicket = {
      tenant: 'test-tenant',
      ticket_id: 'T-1',
      ticket_number: 'TKT-001',
      title: 'Test Ticket',
      channel_id: 'CH-1',
      company_id: 'COMP-1',
      contact_name_id: 'CNT-1',
      status_id: 'ST-1',
      category_id: 'CAT-1',
      entered_by: regularUser.user_id,
      priority_id: 'PRI-1'
    };

    // Reset mocks before each test
    vi.resetAllMocks();

    // Mock Ticket.getAll to return our mockTicket
    (Ticket.getAll as any).mockResolvedValue([mockTicket]);

    // Mock Ticket.update to return 'success'
    (Ticket.update as any).mockResolvedValue('success');

    // Mock Ticket.get to return our mockTicket
    (Ticket.get as any).mockResolvedValue(mockTicket);

    // Mock Ticket.insert to return our mockTicket
    (Ticket.insert as any).mockResolvedValue(mockTicket);

    // Mock Ticket.delete to return 'success'
    (Ticket.delete as any).mockResolvedValue('success');
  });

  it('should allow regular user to view tickets', async () => {
    const tickets = await ticketActions.getTickets(regularUser);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toEqual(mockTicket);
    expect(Ticket.getAll).toHaveBeenCalledWith(regularUser.tenant);
  });

  it('should allow admin user to view tickets', async () => {
    const tickets = await ticketActions.getTickets(adminUser);
    expect(tickets).toHaveLength(1);
    expect(tickets[0]).toEqual(mockTicket);
    expect(Ticket.getAll).toHaveBeenCalledWith(adminUser.tenant);
  });

  it('should throw an error if user does not have view permission', async () => {
    const userWithoutPermission: IUserWithRoles = { ...regularUser, roles: [] };
    await expect(ticketActions.getTickets(userWithoutPermission)).rejects.toThrow('Permission denied: Cannot view tickets');
  });

  it('should allow admin user to edit a ticket', async () => {
    const updateData: Partial<ITicket> = {
      status_id: 'ST-2',
      updated_by: adminUser.user_id,
    };
    const result = await ticketActions.updateTicket('T-1', updateData, adminUser);
    expect(result).toBe('success');
    expect(Ticket.update).toHaveBeenCalledWith('T-1', updateData, adminUser.tenant);
  });

  it('should not allow regular user to edit a ticket', async () => {
    const updateData: Partial<ITicket> = {
      status_id: 'ST-2',
      updated_by: regularUser.user_id,
    };
    await expect(ticketActions.updateTicket('T-1', updateData, regularUser)).rejects.toThrow('Permission denied: Cannot edit ticket');
    expect(Ticket.update).not.toHaveBeenCalled();
  });

  it('should allow admin user to create a ticket', async () => {
    const mockFormData = new FormData();
    mockFormData.append('title', 'New Test Ticket');
    mockFormData.append('channel_id', 'CH-2');
    mockFormData.append('company_id', 'COMP-2');
    mockFormData.append('contact_name_id', 'CNT-2');
    mockFormData.append('status_id', 'ST-1');
    mockFormData.append('category_id', 'CAT-2');
    mockFormData.append('priority_id', 'PRI-2');

    const result = await ticketActions.addTicket(mockFormData, adminUser);
    expect(result).toEqual(mockTicket);
    expect(Ticket.insert).toHaveBeenCalled();
  });

  it('should not allow regular user to create a ticket', async () => {
    const mockFormData = new FormData();
    mockFormData.append('title', 'New Test Ticket');

    await expect(ticketActions.addTicket(mockFormData, regularUser)).rejects.toThrow('Permission denied: Cannot create ticket');
    expect(Ticket.insert).not.toHaveBeenCalled();
  });

  it('should allow admin user to delete a ticket', async () => {
    const result = await ticketActions.deleteTicket('T-1', adminUser);
    expect(result).toBe('success');
    expect(Ticket.delete).toHaveBeenCalledWith('T-1', adminUser.tenant);
  });

  it('should not allow regular user to delete a ticket', async () => {
    await expect(ticketActions.deleteTicket('T-1', regularUser)).rejects.toThrow('Permission denied: Cannot delete ticket');
    expect(Ticket.delete).not.toHaveBeenCalled();
  });
});
