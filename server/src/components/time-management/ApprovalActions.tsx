import { useState } from 'react';
import { ITimeSheet } from '@/interfaces/timeEntry.interfaces';
import { Button } from '../ui/Button';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../ui/Dialog';
import { TextArea } from '../ui/TextArea';

interface ApprovalActionsProps {
  timeSheet: ITimeSheet;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestChanges: (changes: { entry_id: string; reason: string }[]) => void;
}

export function ApprovalActions({ timeSheet, onApprove, onReject, onRequestChanges }: ApprovalActionsProps) {
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isChangesDialogOpen, setIsChangesDialogOpen] = useState(false);
  const [changeRequests, setChangeRequests] = useState<{ entry_id: string; reason: string }[]>([]);

  const handleApprove = () => {
    onApprove();
  };

  const handleReject = () => {
    onReject(rejectReason);
    setIsRejectDialogOpen(false);
    setRejectReason('');
  };

  const handleRequestChanges = () => {
    onRequestChanges(changeRequests);
    setIsChangesDialogOpen(false);
    setChangeRequests([]);
  };

  return (
    <div className="mb-4 flex space-x-2">
      <Button onClick={handleApprove}>Approve</Button>
      <Button onClick={() => setIsRejectDialogOpen(true)}>Reject</Button>
      <Button onClick={() => setIsChangesDialogOpen(true)}>Request Changes</Button>

      <Dialog isOpen={isRejectDialogOpen} onClose={() => setIsRejectDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Reject Time Sheet</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <TextArea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Enter reason for rejection"
            label="Rejection Reason"
          />
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleReject}>Confirm Reject</Button>
        </DialogFooter>
      </Dialog>

      <Dialog isOpen={isChangesDialogOpen} onClose={() => setIsChangesDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>Request Changes</DialogTitle>
        </DialogHeader>
        <DialogContent>
            <></>
          {/* Implement a form or interface for specifying change requests */}
        </DialogContent>
        <DialogFooter>
          <Button onClick={() => setIsChangesDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRequestChanges}>Confirm Changes</Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}