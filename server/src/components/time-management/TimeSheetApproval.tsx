import React, { useState, useEffect } from 'react';
import { ITimeSheet, ITimeEntry, ITimeSheetComment, ITimeSheetApproval, ITimeEntryWithWorkItem, TimeSheetStatus } from '@/interfaces/timeEntry.interfaces';
import { addCommentToTimeSheet } from '@/lib/actions/timeSheetActions';
import { FaCheck, FaTimes, FaClock, FaUndo, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { IWorkItem } from '@/interfaces/workItem.interfaces';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TextArea } from '@/components/ui/TextArea';
import { IUser } from '@/interfaces/auth.interfaces';
import { fetchWorkItemsForTimeSheet } from '@/lib/actions/timeEntryActions';
import { Select } from '@/components/ui/Select';
import { saveTimeEntry } from '@/lib/actions/timeEntryActions';
import { parseISO } from 'date-fns';

interface TimeSheetApprovalProps {
  timeSheet: ITimeSheetApproval;
  timeEntries: ITimeEntry[];
  currentUser: IUser;
  onApprove: () => void;
  onRequestChanges: () => void;
}


interface TimeEntryDetailPanelProps {
  entry: ITimeEntryWithWorkItem;
  onUpdateApprovalStatus: (entryId: string, status: TimeSheetStatus) => void;
}


interface StatusIconProps {
  status: TimeSheetStatus;
}

const StatusIcon: React.FC<StatusIconProps> = ({ status }) => {
  const iconProps = {
    className: 'w-5 h-5',
  };

  switch (status) {
    case 'APPROVED':
      return <FaCheck {...iconProps} className={`${iconProps.className} text-green-500`} />;
    case 'CHANGES_REQUESTED':
      return <FaUndo {...iconProps} className={`${iconProps.className} text-orange-500`} />;
    case 'DRAFT':
    default:
      return <FaClock {...iconProps} className={`${iconProps.className} text-gray-500`} />;
  }
};
const TimeEntryDetailPanel: React.FC<TimeEntryDetailPanelProps> = ({ entry, onUpdateApprovalStatus }) => {
  const [approvalStatus, setApprovalStatus] = useState<TimeSheetStatus>(entry.approval_status);

  const handleStatusChange = (newStatus: TimeSheetStatus) => {
    setApprovalStatus(newStatus);
    onUpdateApprovalStatus(entry.entry_id as string, newStatus);
  };

  const getButtonClasses = (status: TimeSheetStatus) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'CHANGES_REQUESTED':
        return 'bg-orange-500 hover:bg-orange-600 text-white';
      case 'DRAFT':
        return 'bg-gray-500 hover:bg-gray-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const statusButtons = [
    { status: 'APPROVED' as TimeSheetStatus, icon: FaCheck, label: 'Approve' },
    { status: 'CHANGES_REQUESTED' as TimeSheetStatus, icon: FaUndo, label: 'Request Changes' },
    { status: 'DRAFT' as TimeSheetStatus, icon: FaClock, label: 'Set to Draft' },
  ];

  return (
    <div className="p-4 bg-gray-50 border-t border-b border-gray-200">
      <h4 className="font-semibold mb-2">Time Entry Details</h4>
      <p><strong>Work Item:</strong> {entry.workItem ? `${entry.workItem.name} (${entry.workItem.type})` : 'N/A'}</p>
      <p><strong>Duration:</strong> {((new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60)).toFixed(2)} hours</p>
      <p><strong>Billable Duration:</strong> {(entry.billable_duration / 60).toFixed(2)} hours</p>
      <div className="mt-2">
        <strong>Notes:</strong>
        <p className="whitespace-pre-wrap">{entry.notes || 'No notes provided.'}</p>
      </div>
      <div className="mt-4">
        <strong>Current Status:</strong> {entry.approval_status}
      </div>
      <div className="mt-4">
        <strong>Update Status:</strong>
        <div className="flex space-x-2 mt-2">
          {statusButtons.map(({ status, icon: Icon, label }):JSX.Element => (
            <Button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={getButtonClasses(status)}
              disabled={entry.approval_status === status}
            >
              <Icon className="mr-2" />
              {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export function TimeSheetApproval({
  timeSheet: initialTimeSheet,
  timeEntries,
  currentUser,
  onApprove,
  onRequestChanges
}: TimeSheetApprovalProps) {
  const [timeSheet, setTimeSheet] = useState<ITimeSheetApproval>(initialTimeSheet);
  const [newComment, setNewComment] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [workItems, setWorkItems] = useState<IWorkItem[]>([]);
  const [entriesWithWorkItems, setEntriesWithWorkItems] = useState<ITimeEntryWithWorkItem[]>([]);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);


  const toggleEntryDetails = (entryId: string) => {
    setExpandedEntryId(expandedEntryId === entryId ? null : entryId);
  };

  const handleUpdateApprovalStatus = async (entryId: string, status: TimeSheetStatus) => {
    try {
      // Find the entry to update
      const entryToUpdate = entriesWithWorkItems.find(entry => entry.entry_id === entryId);

      if (!entryToUpdate) {
        throw new Error('Time entry not found');
      }

      // Create an updated entry object
      const { ...entryWithoutWorkItem } = entryToUpdate;
      const updatedEntry: ITimeEntry = {
        ...entryWithoutWorkItem,
        approval_status: status,
      };

      // Call the API to update the time entry
      await saveTimeEntry(updatedEntry);

      // Update the local state
      setEntriesWithWorkItems(prevEntries =>
        prevEntries.map((entry):ITimeEntryWithWorkItem =>
          entry.entry_id === entryId ? { ...entry, approval_status: status } : entry
        )
      );

      // Show a success notification
      // toast.success(`Time entry status updated to ${status}`);

      // Check if all entries are now approved
      const allApproved = entriesWithWorkItems.every(entry =>
        entry.entry_id === entryId ? status === 'APPROVED' : entry.approval_status === 'APPROVED'
      );

      if (allApproved) {
        // If all entries are approved, call the onApprove function to update the overall timesheet status
        await onApprove();
        // toast.success('All time entries approved. Timesheet status updated.');
      }

    } catch (error) {
      console.error('Failed to update time entry status:', error);
      // toast.error('Failed to update time entry status. Please try again.');
    }
  };

  useEffect(() => {
    async function fetchWorkItems() {
      const fetchedWorkItems = await fetchWorkItemsForTimeSheet(timeSheet.id);
      setWorkItems(fetchedWorkItems);

      // Combine time entries with work items
      const combinedEntries = timeEntries.map((entry):ITimeEntryWithWorkItem => {
        const workItem = fetchedWorkItems.find(item => item.work_item_id === entry.work_item_id);
        return { ...entry, workItem } as ITimeEntryWithWorkItem;
      });
      setEntriesWithWorkItems(combinedEntries);
    }
    fetchWorkItems();
  }, [timeSheet, timeEntries]);

  // Calculate summary statistics
  const totalHours = timeEntries.reduce((sum, entry) => {
    const totalDuration = (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60);
    return sum + totalDuration;
  }, 0);
  const totalBillableHours = timeEntries.reduce((sum, entry) => sum + entry.billable_duration / 60, 0);
  const totalNonBillableHours = totalHours - totalBillableHours;

  // Group entries by work item type
  const entriesByType = timeEntries.reduce((acc, entry) => {
    const totalDuration = (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60);
    acc[entry.work_item_type] = (acc[entry.work_item_type] || 0) + totalDuration;
    return acc;
  }, {} as Record<string, number>);

  // Group entries by date
  const entriesByDate = timeEntries.reduce((acc, entry) => {
    const date = new Date(entry.start_time).toDateString();
    const totalDuration = (new Date(entry.end_time).getTime() - new Date(entry.start_time).getTime()) / (1000 * 60 * 60);
    acc[date] = (acc[date] || 0) + totalDuration;
    return acc;
  }, {} as Record<string, number>);

  const handleAddComment = async () => {
    if (newComment.trim() && !isAddingComment) {
      setIsAddingComment(true);
      try {
        const comment = await addCommentToTimeSheet(
          timeSheet.id,
          currentUser.user_id,
          newComment,
          true
        );

        setTimeSheet(prevTimeSheet => ({
          ...prevTimeSheet,
          comments: [...(prevTimeSheet.comments || []), comment]
        }));

        setNewComment('');
      } catch (error) {
        console.error('Failed to add comment:', error);
        // Show error message to user
      } finally {
        setIsAddingComment(false);
      }
    }
  };

  const formatWorkItem = (workItem?: IWorkItem) => {
    if (!workItem) return 'N/A';
    return `${workItem.name} (${workItem.type})`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Time Sheet Approval for {timeSheet.employee_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Period: { (timeSheet.time_period?.start_date) ? parseISO(timeSheet.time_period?.start_date).toLocaleDateString() : "N/A"} - { (timeSheet.time_period?.end_date) ? parseISO(timeSheet.time_period?.end_date).toLocaleDateString() : "N/A"}</p>
          <p>Status: {timeSheet.approval_status}</p>
          <p>Submitted: {timeSheet.submitted_at?.toLocaleString()}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Total Hours: {totalHours.toFixed(2)}</p>
          <p>Billable Hours: {totalBillableHours.toFixed(2)}</p>
          <p>Non-Billable Hours: {totalNonBillableHours.toFixed(2)}</p>
          {/* Add overtime calculation if applicable */}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breakdown by Work Item Type</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(entriesByType).map(([type, hours]):JSX.Element => (
            <p key={type}>{type}: {hours.toFixed(2)} hours</p>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {Object.entries(entriesByDate).map(([date, hours]):JSX.Element => (
            <p key={date}>{date}: {hours.toFixed(2)} hours</p>
          ))}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Detailed Time Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th>Date</th>
                <th>Work Item</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th>Billable Hours</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entriesWithWorkItems.map((entry):JSX.Element => (
                <React.Fragment key={entry.entry_id}>
                  <tr
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleEntryDetails(entry.entry_id as string)}
                  >
                    <td>{new Date(entry.start_time).toLocaleDateString()}</td>
                    <td>{formatWorkItem(entry.workItem)}</td>
                    <td>{new Date(entry.start_time).toLocaleTimeString()}</td>
                    <td>{new Date(entry.end_time).toLocaleTimeString()}</td>
                    <td>{(entry.billable_duration / 60).toFixed(2)}</td>
                    <td className="text-center">
                      <StatusIcon status={entry.approval_status} />
                    </td>
                    <td>
                      <Button
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleEntryDetails(entry.entry_id as string);
                        }}
                        title={expandedEntryId === entry.entry_id ? "Hide Details" : "Show Details"}
                      >
                        {expandedEntryId === entry.entry_id ? (
                          <FaChevronUp className="h-4 w-4" />
                        ) : (
                          <FaChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </td>
                  </tr>
                  {expandedEntryId === entry.entry_id && (
                    <tr>
                      <td colSpan={7}>
                        <TimeEntryDetailPanel
                          entry={entry}
                          onUpdateApprovalStatus={handleUpdateApprovalStatus}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Add sections for Leave and Time Off, Previous Period Comparison if data is available */}


      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {timeSheet.comments?.map((comment):JSX.Element => (
              <div key={comment.comment_id} className="border-b pb-2">
                <p className="font-semibold">
                  {timeSheet.employee_name} ({comment.is_approver ? 'Approver' : 'Employee'})
                </p>
                <p>{comment.comment}</p>
                <p className="text-sm text-gray-500">{comment.created_at.toLocaleString()}</p>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <TextArea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
            />
            <Button
              onClick={handleAddComment}
              className="mt-2"
              disabled={isAddingComment}
            >
              {isAddingComment ? 'Adding...' : 'Add Comment'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button onClick={onApprove} variant="default">Approve</Button>
        <Button onClick={onRequestChanges} variant="outline">Request Changes</Button>
      </div>
    </div>
  );
}
