// server/src/components/tickets/TicketDetails.tsx
'use client'

import React, { useEffect, useState, useCallback } from 'react';
import { ITicket, IComment, ITimeSheet, ITimePeriod, ITimeEntry, ICompany, IContact, IUser, IUserWithRoles, ITeam, ITicketResource } from '@/interfaces';
import TicketInfo from './TicketInfo';
import TicketProperties from './TicketProperties';
import TicketConversation from './TicketConversation';
import { TimeEntryDialog } from '../time-management/TimeEntryDialog';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { useDrawer } from '@/context/DrawerContext';
import { useTenant } from '@/components/TenantProvider';
import { findUserById, getAllUsers, getCurrentUser } from '@/lib/actions/user-actions/userActions';
import { findChannelById, getAllChannels } from '@/lib/actions/channel-actions/channelActions';
import { findCommentsByTicketId, deleteComment, createComment, updateComment, findCommentById } from '@/lib/actions/comment-actions/commentActions';
import { getDocumentByTicketId } from '@/lib/actions/document-actions/documentActions';
import { getContactByContactNameId } from '@/lib/actions/contact-actions/contactActions';
import { getCompanyById } from '@/lib/actions/companyActions';
import { updateTicket } from '@/lib/actions/ticket-actions/ticketActions';
import { getTicketStatuses } from '@/lib/actions/status-actions/statusActions';
import { getAllPriorities } from '@/lib/actions/priorityActions';
import { fetchTimeSheets, fetchOrCreateTimeSheet, saveTimeEntry } from '@/lib/actions/timeEntryActions';
import { getCurrentTimePeriod } from '@/lib/actions/timePeriodsActions';
import CompanyDetails from '../companies/CompanyDetails';
import ContactDetailsView from '@/components/contacts/ContactDetailsView';
import AvatarIcon from '@/components/ui/AvatarIcon';
import { addTicketResource, getTicketResources, removeTicketResource } from '@/lib/actions/ticketResourceActions';
import TechnicianDispatchDashboard from '@/components/technician-dispatch/TechnicianDispatchDashboard';

interface TicketDetailsProps {
  initialTicket: ITicket;
}

const TicketDetails: React.FC<TicketDetailsProps> = ({ initialTicket }) => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const tenant = useTenant();
  if (!tenant) {
    throw new Error('tenant is not defined');
  }

  const [ticket, setTicket] = useState(initialTicket);
  const [conversations, setConversations] = useState<IComment[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [company, setCompany] = useState<ICompany | null>(null);
  const [contactInfo, setContactInfo] = useState<IContact | null>(null);
  const [contactCompany, setContactCompany] = useState<ICompany | null>(null);
  const [createdByUser, setCreatedByUser] = useState<IUser | null>(null);
  const [channel, setChannel] = useState<any>(null);

  const [statusOptions, setStatusOptions] = useState<{ value: string, label: string }[]>([]);
  const [agentOptions, setAgentOptions] = useState<{ value: string, label: string }[]>([]);
  const [channelOptions, setChannelOptions] = useState<{ value: string, label: string }[]>([]);
  const [priorityOptions, setPriorityOptions] = useState<{ value: string, label: string }[]>([]);

  const [userMap, setUserMap] = useState<Record<string, { user_id: string; first_name: string; last_name: string; email?: string }>>({});

  const [newCommentContent, setNewCommentContent] = useState('');
  const [activeTab, setActiveTab] = useState('Comments');
  const [isEditing, setIsEditing] = useState(false);
  const [currentComment, setCurrentComment] = useState<IComment | null>(null);

  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(true); // Start timer automatically
  const [timeDescription, setTimeDescription] = useState('');
  const [isTimeEntryDialogOpen, setIsTimeEntryDialogOpen] = useState(false);
  const [currentTimeSheet, setCurrentTimeSheet] = useState<ITimeSheet | null>(null);
  const [currentTimePeriod, setCurrentTimePeriod] = useState<ITimePeriod | null>(null);

  const [availableAgents, setAvailableAgents] = useState<IUserWithRoles[]>([]);
  const [additionalAgents, setAdditionalAgents] = useState<ITicketResource[]>([]);
  const [team, setTeam] = useState<ITeam | null>(null);

  const { openDrawer } = useDrawer();

  // Timer logic
  const tick = useCallback(() => {
    setElapsedTime(prevTime => prevTime + 1);
  }, []);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(tick, 1000);
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, tick]);

  useEffect(() => {
    const fetchData = async () => {
      const ticketId = initialTicket.ticket_id;

      try {
        // Get current user first as we need it for several operations
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          toast.error('No user session found');
          return;
        }

        const comments = await findCommentsByTicketId(ticketId || '');
        setConversations(comments);

        const docs = await getDocumentByTicketId(ticketId || '');
        setDocuments(docs);

        if (ticket.company_id) {
          const companyData = await getCompanyById(ticket.company_id);
          setCompany(companyData);
        }

        if (ticket.contact_name_id) {
          const contactData = await getContactByContactNameId(ticket.contact_name_id);
          setContactInfo(contactData);
        }

        if (ticket.entered_by) {
          const userData = await findUserById(ticket.entered_by);
          setCreatedByUser(userData);
        }

        const channel = await findChannelById(ticket.channel_id);
        setChannel(channel);

        const resources = await getTicketResources(ticketId!, currentUser);
        setAdditionalAgents(resources);

        const users = await getAllUsers();
        setAvailableAgents(users);

        const userMapData = users.reduce((acc, user) => {
          acc[user.user_id] = { 
            user_id: user.user_id, 
            first_name: user.first_name || '', 
            last_name: user.last_name || '',
            email: user.email // Include email in the userMap
          };
          return acc;
        }, {} as Record<string, { user_id: string; first_name: string; last_name: string; email?: string }>);
        setUserMap(userMapData);

        const statuses = await getTicketStatuses();
        setStatusOptions(statuses.map((status): { value: string; label: string } => ({ 
          value: status.status_id!, 
          label: status.name ?? "" 
        })));

        setAgentOptions(users.map((agent): { value: string; label: string } => ({ 
          value: agent.user_id, 
          label: `${agent.first_name} ${agent.last_name}` 
        })));

        const channels = await getAllChannels();
        setChannelOptions(channels.filter(channel => channel.channel_id !== undefined)
          .map((channel): { value: string; label: string } => ({ 
            value: channel.channel_id!, 
            label: channel.channel_name ?? "" 
          })));

        const priorities = await getAllPriorities();
        setPriorityOptions(priorities.map((priority): { value: string; label: string } => ({ 
          value: priority.priority_id, 
          label: priority.priority_name 
        })));

      } catch (error) {
        console.error('Error fetching ticket data:', error);
        toast.error('Failed to load ticket data');
      }
    };

    fetchData();
  }, [initialTicket.ticket_id]);

  const handleCompanyClick = async () => {
    if (ticket.company_id) {
      try {
        const company = await getCompanyById(ticket.company_id);
        if (company) {
          openDrawer(
            <CompanyDetails 
              company={company} 
              documents={[]} 
              contacts={[]} 
              isInDrawer={true} // Add this prop
            />
          );
        } else {
          console.error('Company not found');
        }
      } catch (error) {
        console.error('Error fetching company details:', error);
      }
    } else {
      console.log('No company associated with this ticket');
    }
  };

  useEffect(() => {
    const fetchContactCompany = async () => {
      if (ticket.company_id) {
        try {
          const companyData = await getCompanyById(ticket.company_id);
          setContactCompany(companyData);
        } catch (error) {
          console.error('Error fetching contact company:', error);
        }
      }
    };

    fetchContactCompany();
  }, [ticket.company_id]);

  const handleContactClick = () => {
    if (contactInfo && contactCompany) {
      openDrawer(
        <ContactDetailsView 
          initialContact={{
            ...contactInfo,
            company_id: contactCompany.company_id
          }}
          companies={[contactCompany]}
          isInDrawer={true} // Add isInDrawer prop
        />
      );
    } else {
      console.log('No contact information or company information available');
    }
  };

  const handleAgentClick = (userId: string) => {
    openDrawer(
      <TechnicianDispatchDashboard />
    );
  };

  const handleAddAgent = async (userId: string) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error('No user session found');
        return;
      }
      const result = await addTicketResource(ticket.ticket_id!, userId, 'support', currentUser);
      setAdditionalAgents(prev => [...prev, result]);
      toast.success('Agent added successfully');
    } catch (error) {
      console.error('Error adding agent:', error);
      toast.error('Failed to add agent');
    }
  };  
  
  const handleRemoveAgent = async (assignmentId: string) => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        toast.error('No user session found');
        return;
      }
      await removeTicketResource(assignmentId, currentUser);
      setAdditionalAgents(prev => prev.filter(agent => agent.assignment_id !== assignmentId));
      toast.success('Agent removed successfully');
    } catch (error) {
      console.error('Error removing agent:', error);
      toast.error('Failed to remove agent');
    }
  };

  const handleSelectChange = async (field: keyof ITicket, newValue: string) => {
    setTicket(prevTicket => ({ ...prevTicket, [field]: newValue }));

    try {
      const user = await getCurrentUser();
      if (!user) {
        console.error('Failed to get user');
        return;
      }
      const result = await updateTicket(ticket.ticket_id || '', { [field]: newValue }, user);
      if (result === 'success') {
        console.log(`${field} changed to: ${newValue}`);
      } else {
        console.error(`Failed to update ticket ${field}`);
        setTicket(prevTicket => ({ ...prevTicket, [field]: ticket[field] }));
      }
    } catch (error) {
      console.error(`Error updating ticket ${field}:`, error);
      setTicket(prevTicket => ({ ...prevTicket, [field]: ticket[field] }));
    }
  };

  const [editorKey, setEditorKey] = useState(0);

  const handleAddNewComment = async () => {
    if (!newCommentContent.trim()) {
      console.log("Cannot add empty note");
      return;
    }
  
    try {
      if (!userId) {
        console.error("No valid user ID found");
        return;
      }
  
      const newComment: Omit<IComment, 'tenant'> = {
        ticket_id: ticket.ticket_id || '',
        note: newCommentContent,
        user_id: userId,
        author_type: 'user', // Set author_type to 'user' since this is a user-created comment
        is_internal: activeTab === 'Internal',
        is_resolution: activeTab === 'Resolution',
        is_initial_description: false,
      };
  
      const commentId = await createComment(newComment);
  
      if (commentId) {
        const newlyCreatedComment = await findCommentById(commentId);
        if (!newlyCreatedComment) {
          console.error('Error fetching newly created comment:', commentId);
          return;
        }
  
        setConversations(prevConversations => [...prevConversations, newlyCreatedComment]);
        setNewCommentContent('');
        console.log("New note added successfully");
      }
    } catch (error) {
      console.error("Error adding new note:", error);
    }
  };
  
  const handleEdit = (conversation: IComment) => {
    setIsEditing(true);
    setCurrentComment(conversation);
  };

  const handleSave = async (updates: Partial<IComment>) => {
    if (!currentComment) return;

    try {
      // Log the updates being sent (for debugging)
      console.log('[handleSave] Updating comment with:', updates);

      // Pass all updates to the updateComment function
      await updateComment(currentComment.comment_id!, updates);

      const updatedCommentData = await findCommentById(currentComment.comment_id!);
      if (updatedCommentData) {
        setConversations(prevConversations =>
          prevConversations.map((conv):IComment =>
            conv.comment_id === updatedCommentData.comment_id ? updatedCommentData : conv
          )
        );
      }

      setIsEditing(false);
      setCurrentComment(null);
    } catch (error) {
      console.error("Error saving comment:", error);
      toast.error("Failed to save comment changes");
    }
  };

  const handleClose = () => {
    setIsEditing(false);
    setCurrentComment(null);
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      setConversations(prevConversations =>
        prevConversations.filter(conv => conv.comment_id !== commentId)
      );
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleContentChange = (content: string) => {
    if (currentComment) {
      setCurrentComment({ ...currentComment, note: content });
    }
  };

  const handleAddTimeEntry = async () => {
    try {
      if (!ticket.ticket_id) {
        console.error('Ticket ID is missing');
        toast.error('Unable to add time entry: Ticket ID is missing');
        return;
      }

      const currentTimePeriod = await getCurrentTimePeriod();

      if (!currentTimePeriod) {
        console.error('No current time period found');
        toast.error('Unable to add time entry: No active time period found. Please contact your administrator.');
        return;
      }

      setCurrentTimePeriod(currentTimePeriod);

      const timeSheet = await fetchOrCreateTimeSheet(userId!, currentTimePeriod.period_id);

      if (!timeSheet) {
        console.error('Failed to fetch or create time sheet');
        toast.error('Unable to add time entry: Failed to create or fetch time sheet');
        return;
      }

      setCurrentTimeSheet(timeSheet);
      setIsTimeEntryDialogOpen(true);
      setIsRunning(false);
      setElapsedTime(0);
    } catch (error) {
      console.error('Error in handleAddTimeEntry:', error);
      toast.error('An error occurred while preparing the time entry. Please try again.');
    }
  };

  return (
    <div className="bg-gray-100">
      {isTimeEntryDialogOpen && currentTimeSheet && (
        <TimeEntryDialog
          isOpen={isTimeEntryDialogOpen}
          onClose={() => setIsTimeEntryDialogOpen(false)}
          onSave={async (timeEntry: Omit<ITimeEntry, 'tenant'>) => {
            try {
              const timeEntryWithSheetId = {
                ...timeEntry,
                time_sheet_id: currentTimeSheet.id
              };
              await saveTimeEntry(timeEntryWithSheetId);
              toast.success('Time entry saved successfully');
              setIsTimeEntryDialogOpen(false);
            } catch (error) {
              console.error('Error saving time entry:', error);
              toast.error('Failed to save time entry. Please try again.');
            }
          }}
          workItem={{
            work_item_id: ticket.ticket_id!,
            type: 'ticket',
            name: ticket.title || 'Untitled Ticket',
            description: ticket.title,
            is_billable: true,
          }}
          date={new Date()}
          existingEntries={[]}
          timePeriod={currentTimePeriod!}
          isEditable={true}
          defaultStartTime={new Date()}
          defaultEndTime={new Date(Date.now() + elapsedTime * 1000)}
        />
      )}
      <div className="flex gap-6">
        <div className="flex-grow col-span-2 space-y-6">
          <TicketInfo
            ticket={ticket}
            conversations={conversations}
            statusOptions={statusOptions}
            agentOptions={agentOptions}
            channelOptions={channelOptions}
            priorityOptions={priorityOptions}
            onSelectChange={handleSelectChange}
          />
          <TicketConversation
            ticket={ticket}
            conversations={conversations}
            documents={documents}
            userMap={userMap}
            currentUser={session?.user}
            newCommentContent={newCommentContent}
            activeTab={activeTab}
            isEditing={isEditing}
            currentComment={currentComment}
            editorKey={editorKey}
            onNewCommentContentChange={setNewCommentContent}
            onAddNewComment={handleAddNewComment}
            onTabChange={setActiveTab}
            onEdit={handleEdit}
            onSave={handleSave}
            onClose={handleClose}
            onDelete={handleDelete}
            onContentChange={handleContentChange}
          />
        </div>
        <TicketProperties
          ticket={ticket}
          company={company}
          contactInfo={contactInfo}
          createdByUser={createdByUser}
          channel={channel}
          elapsedTime={elapsedTime}
          isRunning={isRunning}
          timeDescription={timeDescription}
          onStart={() => setIsRunning(true)}
          onPause={() => setIsRunning(false)}
          onStop={() => {
            setIsRunning(false);
            setElapsedTime(0);
          }}
          onTimeDescriptionChange={setTimeDescription}
          onAddTimeEntry={handleAddTimeEntry}
          onCompanyClick={handleCompanyClick}
          onContactClick={handleContactClick}
          team={team}
          additionalAgents={additionalAgents}
          availableAgents={availableAgents}
          onAgentClick={handleAgentClick}
          onAddAgent={handleAddAgent}
          onRemoveAgent={handleRemoveAgent}
          currentTimeSheet={currentTimeSheet}
          currentTimePeriod={currentTimePeriod}
          userId={userId || ''}
        />
      </div>
    </div>
  );
};

export default TicketDetails;
