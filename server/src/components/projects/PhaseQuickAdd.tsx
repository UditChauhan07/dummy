// server/src/components/projects/PhaseQuickAdd.tsx
'use client'
import React, { useState } from 'react';
import { IProjectPhase } from '@/interfaces/project.interfaces';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import EditableText from '@/components/ui/EditableText';
import { toast } from 'react-hot-toast';
import { addProjectPhase } from '@/lib/actions/projectActions';

interface PhaseQuickAddProps {
  projectId: string;
  onClose: () => void;
  onPhaseAdded: (newPhase: IProjectPhase) => void;
  onCancel: () => void;
}


const PhaseQuickAdd: React.FC<PhaseQuickAddProps> = ({ 
  projectId,
  onClose, 
  onPhaseAdded,
  onCancel
}) => {
  const [phaseName, setPhaseName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phaseName.trim() === '') return;

    setIsSubmitting(true);

    try {
      const phaseData = {
        project_id: projectId,
        phase_name: phaseName.trim(),
        description: description || null,
        start_date: null,
        end_date: null,
        status: 'In Progress',
        order_number: 0, // Will be set by server
        wbs_code: '', // Will be set by server
      };

      const newPhase = await addProjectPhase(phaseData);
      onPhaseAdded(newPhase);
      onClose();
    } catch (error) {
      console.error('Error adding phase:', error);
      toast.error('Failed to add phase. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg w-[600px] max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Add New Phase
          </Dialog.Title>
          <form onSubmit={handleSubmit} className="flex flex-col">
            <div className="space-y-4">
              <EditableText
                value={phaseName}
                onChange={setPhaseName}
                placeholder="Phase name..."
                className="w-full text-lg font-semibold"
              />
              <TextArea
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Description"
                className="w-full p-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                rows={3}
              />
              <div className="flex justify-between mt-6">
                <Button variant="ghost" onClick={handleCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Save'}
                </Button>
              </div>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default PhaseQuickAdd;
