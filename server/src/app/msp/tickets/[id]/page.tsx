import React from 'react';
import TicketDetails from '@/components/tickets/TicketDetails';
import { ITicket } from '@/interfaces/ticket.interfaces';
import Ticket from '@/lib/models/ticket';
import { formatDistanceToNow } from 'date-fns';
import BackNav from '@/components/ui/BackNav';

const TicketPage = async ({ params }: { params: { id: string } }) => {
  const { id } = params;

  let ticket: ITicket | undefined;

  try {
    // Get ticket details
    ticket = await Ticket.get(id);
  } catch (error) {
    console.error(`Error fetching ticket with id ${id}:`, error);
  }

  if (!ticket) {
    return <div>Ticket not found</div>;
  }

  return (
    <div className="bg-gray-100">
      <div className="flex items-center space-x-5 mb-4">
        <BackNav>Back to Tickets</BackNav>
        <h6 className="text-sm font-medium">#{ticket.ticket_number}</h6>
        <h1 className="text-xl font-bold">{ticket.title}</h1>
      </div>

      <div className="flex items-center space-x-5 mb-5">
        {ticket.entered_at && (
          <p>Created {formatDistanceToNow(new Date(ticket.entered_at))} ago</p>
        )}
        {ticket.updated_at && (
          <p>Updated {formatDistanceToNow(new Date(ticket.updated_at))} ago</p>
        )}
      </div>

      <TicketDetails initialTicket={ticket} />
    </div>
  );
}

export default TicketPage;
